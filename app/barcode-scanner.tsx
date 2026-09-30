import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Host, Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import {
  macrosForGrams,
  quantityPresets,
  sumFoodItems,
  type MacrosPer100g,
} from '@/domain';
import {
  lookupBarcode,
  useFoodAnalysis,
  useFoodDraftStore,
  type AnalysisFailure,
  type DraftFoodItem,
} from '@/features/food';
import { toISODate } from '@/lib/date';
import { themeColor } from '@/theme/colors';

type ScanMode = 'barcode' | 'label';

/** A resolved product (from Open Food Facts or a scanned nutrition table). */
interface ScanProduct {
  name: string;
  barcode?: string;
  per100g: MacrosPer100g;
  servingGrams: number | null;
}

/** Why the last scan did not produce a product; drives the fallback panel. */
type Problem =
  'notFound' | 'incomplete' | 'offline' | 'labelUnreadable' | 'labelError';

const RESCAN_COOLDOWN_MS = 2500;

export default function BarcodeScannerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<ScanMode>(
    params.mode === 'label' ? 'label' : 'barcode',
  );
  const [product, setProduct] = useState<ScanProduct | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [gramsText, setGramsText] = useState('100');
  const [added, setAdded] = useState<DraftFoodItem[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const start = useFoodDraftStore((s) => s.start);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setTitle = useFoodDraftStore((s) => s.setTitle);
  const setStatus = useFoodDraftStore((s) => s.setStatus);
  const { analyzeLabelPhoto } = useFoodAnalysis();

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="bg-system-background flex-1 items-center justify-center gap-4 px-8">
        <SymbolView name="barcode.viewfinder" size={40} />
        <Text className="text-label text-center text-base">
          {t('food.barcode.permissionBody')}
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          className="bg-tint rounded-xl px-5 py-3"
        >
          <Text className="text-base font-semibold text-white">
            {t('food.barcode.grantAccess')}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text className="text-tint text-base">
            {t('food.logFood.cancel')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const problemTexts = (p: Problem): { title: string; body: string } => {
    switch (p) {
      case 'notFound':
        return {
          title: t('food.problem.notFound.title'),
          body: t('food.problem.notFound.body'),
        };
      case 'incomplete':
        return {
          title: t('food.problem.incomplete.title'),
          body: t('food.problem.incomplete.body'),
        };
      case 'offline':
        return {
          title: t('food.problem.offline.title'),
          body: t('food.problem.offline.body'),
        };
      case 'labelUnreadable':
        return {
          title: t('food.problem.labelUnreadable.title'),
          body: t('food.problem.labelUnreadable.body'),
        };
      case 'labelError':
        return {
          title: t('food.problem.labelError.title'),
          body: t('food.problem.labelError.body'),
        };
    }
  };

  const scanActive = mode === 'barcode' && !product && !problem && !isWorking;

  const showProduct = (next: ScanProduct) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGramsText(String(Math.round(next.servingGrams ?? 100)));
    setProduct(next);
  };

  const handleScanned = async (code: string) => {
    if (busyRef.current) return;
    const last = lastScan.current;
    if (last && last.code === code && Date.now() - last.at < RESCAN_COOLDOWN_MS)
      return;
    busyRef.current = true;
    lastScan.current = { code, at: Date.now() };
    setIsWorking(true);
    try {
      const result = await lookupBarcode(code);
      if (result.status === 'error') {
        setProblem('offline');
      } else if (result.status === 'not_found') {
        setProblem('notFound');
      } else if (!result.product.hasNutrition) {
        setProblem('incomplete');
      } else {
        const p = result.product;
        showProduct({
          name: p.name,
          barcode: p.barcode,
          per100g: {
            kcal: p.kcalPer100g,
            proteinG: p.proteinPer100g,
            carbsG: p.carbsPer100g,
            fatG: p.fatPer100g,
          },
          servingGrams: p.servingGrams,
        });
      }
    } finally {
      busyRef.current = false;
      setIsWorking(false);
    }
  };

  const captureLabel = async () => {
    if (busyRef.current || product || problem) return;
    busyRef.current = true;
    setIsWorking(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        setProblem('labelError');
        return;
      }
      const outcome = await analyzeLabelPhoto(photo.uri);
      if ('label' in outcome) {
        const { label } = outcome;
        showProduct({
          name: label.product_name?.trim() || t('food.label.unnamed'),
          per100g: {
            kcal: label.per_100g.kcal,
            proteinG: label.per_100g.protein_g,
            carbsG: label.per_100g.carbs_g,
            fatG: label.per_100g.fat_g,
          },
          servingGrams: label.serving_size_g,
        });
      } else {
        handleLabelFailure(outcome.failure);
      }
    } catch {
      setProblem('labelError');
    } finally {
      busyRef.current = false;
      setIsWorking(false);
    }
  };

  const handleLabelFailure = (failure: AnalysisFailure) => {
    if (failure === 'ai_limit_reached') {
      router.push('/paywall');
      return;
    }
    setProblem(
      failure === 'label_not_readable' ? 'labelUnreadable' : 'labelError',
    );
  };

  const grams = Math.max(0, Number(gramsText.replace(',', '.')) || 0);
  const preview = product ? macrosForGrams(product.per100g, grams) : null;

  const buildItem = (): DraftFoodItem | null => {
    if (!product || grams <= 0) return null;
    return {
      id: Crypto.randomUUID(),
      name: product.name,
      ...macrosForGrams(product.per100g, grams),
      barcode: product.barcode ?? null,
    };
  };

  const resetScan = () => {
    setProduct(null);
    setProblem(null);
    lastScan.current = null;
  };

  const openReview = (items: DraftFoodItem[]) => {
    start({ date: toISODate(), source: 'barcode' });
    setTitle(
      items.length === 1
        ? items[0].name
        : items
            .map((i) => i.name)
            .join(', ')
            .slice(0, 60),
    );
    setItems(items);
    setStatus('ready');
    router.replace('/food-review');
  };

  const addAndContinue = () => {
    const item = buildItem();
    if (!item) return;
    setAdded((prev) => [...prev, item]);
    void Haptics.selectionAsync();
    resetScan();
  };

  const addAndReview = () => {
    const item = buildItem();
    if (!item) return;
    openReview([...added, item]);
  };

  const enterManually = () => {
    openReview(
      added.length > 0
        ? added
        : [
            {
              id: Crypto.randomUUID(),
              name: '',
              grams: 100,
              kcal: 0,
              proteinG: 0,
              carbsG: 0,
              fatG: 0,
            },
          ],
    );
  };

  const switchMode = (next: ScanMode) => {
    setMode(next);
    resetScan();
  };

  const addedTotals = sumFoodItems(added);

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={
          scanActive ? (result) => void handleScanned(result.data) : undefined
        }
      />

      <Pressable
        onPress={() => router.back()}
        className="absolute left-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/50"
        accessibilityRole="button"
        accessibilityLabel={t('food.logFood.cancel')}
      >
        <SymbolView name="xmark" size={18} tintColor="white" />
      </Pressable>

      {added.length > 0 && (
        <Pressable
          onPress={() => openReview(added)}
          className="bg-tint absolute right-4 top-14 h-10 flex-row items-center gap-2 rounded-full px-4"
          accessibilityRole="button"
        >
          <Text className="text-sm font-semibold text-white">
            {t('food.barcode.itemsAdded', {
              count: added.length,
              kcal: Math.round(addedTotals.kcal),
            })}
          </Text>
          <SymbolView name="chevron.right" size={12} tintColor="white" />
        </Pressable>
      )}

      {!product && !problem && (
        <>
          {mode === 'barcode' && (
            <View
              pointerEvents="none"
              className="absolute left-10 right-10 top-1/3 h-36 rounded-3xl border-2 border-white/70"
            />
          )}
          <View className="absolute inset-x-0 bottom-0 items-center gap-4 px-6 pb-10">
            <Text className="rounded-full bg-black/50 px-4 py-2 text-center text-sm text-white">
              {isWorking
                ? mode === 'label'
                  ? t('food.label.reading')
                  : t('food.barcode.looking')
                : mode === 'label'
                  ? t('food.label.hint')
                  : t('food.barcode.hint')}
            </Text>
            {mode === 'label' && (
              <Pressable
                onPress={() => void captureLabel()}
                disabled={isWorking}
                className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white"
                style={{ opacity: isWorking ? 0.5 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={t('food.label.capture')}
              >
                {isWorking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="h-14 w-14 rounded-full bg-white" />
                )}
              </Pressable>
            )}
            <View className="w-full max-w-[320px] rounded-xl bg-black/40 p-1">
              <Host matchContents style={{ width: '100%' }}>
                <Picker
                  selection={mode}
                  onSelectionChange={(value) => switchMode(value as ScanMode)}
                  modifiers={[pickerStyle('segmented')]}
                >
                  <SwiftUIText modifiers={[tag('barcode')]}>
                    {t('food.barcode.modeBarcode')}
                  </SwiftUIText>
                  <SwiftUIText modifiers={[tag('label')]}>
                    {t('food.barcode.modeLabel')}
                  </SwiftUIText>
                </Picker>
              </Host>
            </View>
          </View>
        </>
      )}

      {problem && (
        <View className="bg-system-background absolute inset-x-0 bottom-0 gap-3 rounded-t-3xl p-5 pb-10">
          <Text className="text-label text-lg font-semibold">
            {problemTexts(problem).title}
          </Text>
          <Text className="text-secondary-label text-sm">
            {problemTexts(problem).body}
          </Text>
          <View className="gap-2 pt-1">
            {(problem === 'notFound' || problem === 'incomplete') && (
              <PanelButton
                primary
                icon="text.viewfinder"
                label={t('food.barcode.scanLabelInstead')}
                onPress={() => switchMode('label')}
              />
            )}
            {(problem === 'labelUnreadable' || problem === 'labelError') && (
              <PanelButton
                primary
                icon="camera.fill"
                label={t('food.label.retake')}
                onPress={resetScan}
              />
            )}
            {(problem === 'offline' ||
              problem === 'notFound' ||
              problem === 'incomplete') && (
              <PanelButton
                icon="barcode.viewfinder"
                label={t('food.barcode.scanAgain')}
                onPress={resetScan}
              />
            )}
            <PanelButton
              icon="square.and.pencil"
              label={t('food.logFood.manual')}
              onPress={enterManually}
            />
          </View>
        </View>
      )}

      {product && preview && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="absolute inset-x-0 bottom-0"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            className="bg-system-background rounded-t-3xl"
            contentContainerClassName="gap-4 p-5 pb-10"
            bounces={false}
          >
            <View className="gap-1">
              <Text
                className="text-label text-lg font-semibold"
                numberOfLines={2}
              >
                {product.name}
              </Text>
              <Text className="text-secondary-label text-xs">
                {t('food.barcode.per100g', {
                  kcal: Math.round(product.per100g.kcal),
                  protein: Math.round(product.per100g.proteinG),
                  carbs: Math.round(product.per100g.carbsG),
                  fat: Math.round(product.per100g.fatG),
                })}
              </Text>
            </View>

            <View className="flex-row flex-wrap items-center gap-2">
              {quantityPresets(product.servingGrams).map((preset, index) => {
                const selected = grams === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setGramsText(String(preset))}
                    className={`rounded-full px-3.5 py-2 ${selected ? 'bg-tint' : 'bg-secondary-system-background'}`}
                  >
                    <Text
                      className={`text-sm font-medium ${selected ? 'text-white' : 'text-label'}`}
                    >
                      {index === 0 && product.servingGrams
                        ? t('food.barcode.serving', { grams: preset })
                        : `${preset} g`}
                    </Text>
                  </Pressable>
                );
              })}
              <View className="bg-secondary-system-background flex-row items-center gap-1 rounded-full px-3">
                <TextInput
                  value={gramsText}
                  onChangeText={setGramsText}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  className="text-label min-w-[44px] py-2 text-center text-sm font-medium"
                  accessibilityLabel={t('food.barcode.quantity')}
                />
                <Text className="text-secondary-label text-sm">g</Text>
              </View>
            </View>

            <Text className="text-label text-base font-semibold">
              {Math.round(preview.kcal)} kcal · P {Math.round(preview.proteinG)}
              g · C {Math.round(preview.carbsG)}g · F {Math.round(preview.fatG)}
              g
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={addAndContinue}
                disabled={grams <= 0}
                className="bg-secondary-system-background flex-1 items-center rounded-xl py-3.5"
                style={{ opacity: grams > 0 ? 1 : 0.4 }}
              >
                <Text className="text-label text-base font-medium">
                  {t('food.barcode.addAndScan')}
                </Text>
              </Pressable>
              <Pressable
                onPress={addAndReview}
                disabled={grams <= 0}
                className="bg-tint flex-1 items-center rounded-xl py-3.5"
                style={{ opacity: grams > 0 ? 1 : 0.4 }}
              >
                <Text className="text-base font-semibold text-white">
                  {t('food.barcode.addAndReview')}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={resetScan} className="items-center">
              <Text className="text-secondary-label text-sm">
                {t('food.logFood.cancel')}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function PanelButton({
  label,
  icon,
  onPress,
  primary,
}: {
  label: string;
  icon: Parameters<typeof SymbolView>[0]['name'];
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-xl py-3.5 ${primary ? 'bg-tint' : 'bg-secondary-system-background'}`}
      accessibilityRole="button"
    >
      <SymbolView
        name={icon}
        size={18}
        tintColor={primary ? 'white' : themeColor('accent')}
      />
      <Text
        className={`text-base font-medium ${primary ? 'text-white' : 'text-label'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
