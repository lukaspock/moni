import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { lookupBarcode, useFoodDraftStore, type OpenFoodFactsProduct } from '@/features/food';
import { toISODate } from '@/lib/date';

export default function BarcodeScannerScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [grams, setGrams] = useState('100');
  const [isLooking, setIsLooking] = useState(false);
  const scannedRef = useRef(false);

  const start = useFoodDraftStore((s) => s.start);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setTitle = useFoodDraftStore((s) => s.setTitle);
  const setStatus = useFoodDraftStore((s) => s.setStatus);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-system-background px-8">
        <SymbolView name="barcode.viewfinder" size={40} />
        <Text className="text-center text-base text-label">
          {t('food.barcode.permissionBody')}
        </Text>
        <Pressable onPress={() => void requestPermission()} className="rounded-xl bg-tint px-5 py-3">
          <Text className="text-base font-semibold text-white">{t('food.barcode.grantAccess')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-tint">{t('food.logFood.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  const handleScanned = async (code: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setIsLooking(true);
    try {
      const result = await lookupBarcode(code);
      if (!result) {
        Alert.alert(t('food.barcode.notFoundTitle'), t('food.barcode.notFoundBody'), [
          { text: t('food.logFood.cancel'), onPress: () => router.back() },
          {
            text: t('food.logFood.enterManually'),
            onPress: () => {
              start({ date: toISODate(), source: 'barcode' });
              setItems([]);
              setStatus('ready');
              router.replace('/food-review');
            },
          },
        ]);
        return;
      }
      setProduct(result);
    } finally {
      setIsLooking(false);
    }
  };

  const confirmQuantity = () => {
    if (!product) return;
    const g = Number(grams) || 100;
    const factor = g / 100;
    start({ date: toISODate(), source: 'barcode' });
    setTitle(product.name);
    setItems([
      {
        id: Crypto.randomUUID(),
        name: product.name,
        grams: g,
        kcal: product.kcalPer100g * factor,
        proteinG: product.proteinPer100g * factor,
        carbsG: product.carbsPer100g * factor,
        fatG: product.fatPer100g * factor,
        barcode: product.barcode,
      },
    ]);
    setStatus('ready');
    router.replace('/food-review');
  };

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={(result) => void handleScanned(result.data)}
      />
      <Pressable
        onPress={() => router.back()}
        className="absolute left-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/50"
      >
        <SymbolView name="xmark" size={18} tintColor="white" />
      </Pressable>
      <View className="absolute inset-x-0 bottom-0 items-center pb-10">
        <Text className="rounded-full bg-black/50 px-4 py-2 text-sm text-white">
          {isLooking ? t('food.barcode.looking') : t('food.barcode.hint')}
        </Text>
      </View>

      {product && (
        <View className="absolute inset-x-0 bottom-0 gap-4 rounded-t-3xl bg-system-background p-5">
          <Text className="text-lg font-semibold text-label">{product.name}</Text>
          <Text className="text-sm text-secondary-label">
            {t('food.barcode.per100g', {
              kcal: Math.round(product.kcalPer100g),
              protein: Math.round(product.proteinPer100g),
              carbs: Math.round(product.carbsPer100g),
              fat: Math.round(product.fatPer100g),
            })}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-base text-label">{t('food.barcode.quantity')}</Text>
            <TextInput
              value={grams}
              onChangeText={setGrams}
              keyboardType="number-pad"
              className="rounded-xl bg-secondary-system-background px-3 py-2 text-base text-label"
              style={{ minWidth: 70, textAlign: 'center' }}
            />
            <Text className="text-base text-secondary-label">g</Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                setProduct(null);
                scannedRef.current = false;
              }}
              className="flex-1 items-center rounded-xl bg-secondary-system-background py-3"
            >
              <Text className="text-base font-medium text-label">{t('food.logFood.cancel')}</Text>
            </Pressable>
            <Pressable onPress={confirmQuantity} className="flex-1 items-center rounded-xl bg-tint py-3">
              <Text className="text-base font-semibold text-white">{t('food.barcode.use')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
