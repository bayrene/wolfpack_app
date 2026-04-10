import { NextResponse } from 'next/server';

interface OFFProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!/^\d{8,14}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 });
  }

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,brands,serving_size,serving_quantity,nutriments`,
    { headers: { 'User-Agent': 'Vitae/1.0 personal-tracker' }, cache: 'no-store' },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const json = await res.json();
  if (json.status === 0 || !json.product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const p: OFFProduct = json.product;
  const n = p.nutriments ?? {};

  // Prefer per-serving values, fall back to per-100g
  const servingQty = p.serving_quantity ?? 100;
  const ratio = servingQty / 100;

  const calories =
    n['energy-kcal_serving'] ??
    (n['energy-kcal_100g'] != null ? Math.round(n['energy-kcal_100g'] * ratio) : null);
  const protein =
    n.proteins_serving ??
    (n.proteins_100g != null ? Math.round(n.proteins_100g * ratio * 10) / 10 : null);
  const carbs =
    n.carbohydrates_serving ??
    (n.carbohydrates_100g != null ? Math.round(n.carbohydrates_100g * ratio * 10) / 10 : null);
  const fat =
    n.fat_serving ??
    (n.fat_100g != null ? Math.round(n.fat_100g * ratio * 10) / 10 : null);

  return NextResponse.json({
    name: [p.product_name, p.brands].filter(Boolean).join(' – ') || 'Unknown product',
    servingSize: p.serving_size ?? `${servingQty}g`,
    calories,
    protein,
    carbs,
    fat,
  });
}
