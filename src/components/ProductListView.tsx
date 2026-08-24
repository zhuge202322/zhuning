import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { PageMotion } from "@/components/PageMotion";
import { ProductCard } from "@/components/ProductCard";
import { formatProductPrice } from "@/lib/currency";
import { productMatchesCategory, type StoreCategoryNode } from '@/lib/storefront-category';
import type { StoreProduct } from "@/lib/storefront-data";

type SortMode = "Featured" | "Price Low" | "Price High";

const sortModes: SortMode[] = ["Featured", "Price Low", "Price High"];
const sortParamByMode: Record<SortMode, string> = { Featured: "featured", "Price Low": "price-low", "Price High": "price-high" };

function flattenCategories(nodes: StoreCategoryNode[]): StoreCategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

export function ProductListView({
  initialCategorySlug = "",
  initialMaxPrice = "",
  initialMinPrice = "",
  initialSortMode = "Featured",
  products,
  categories,
}: {
  initialCategorySlug?: string;
  initialMaxPrice?: string;
  initialMinPrice?: string;
  initialSortMode?: SortMode;
  products: StoreProduct[];
  categories: StoreCategoryNode[];
}) {
  const flatCategories = flattenCategories(categories);
  const selectedCategory = flatCategories.find((item) => item.slug === initialCategorySlug) ?? null;
  const minPrice = initialMinPrice.trim();
  const maxPrice = initialMaxPrice.trim();
  const prices = products.map((product) => product.price);
  const priceRange = { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 };
  const byCategory = selectedCategory
    ? products.filter((product) => productMatchesCategory(product.categoryAssignments, selectedCategory.descendantIds))
    : products;
  const minimum = minPrice === "" ? Number.NEGATIVE_INFINITY : Number(minPrice);
  const maximum = maxPrice === "" ? Number.POSITIVE_INFINITY : Number(maxPrice);
  const byPrice = byCategory.filter((product) => product.price >= minimum && product.price <= maximum);
  const filteredProducts = initialSortMode === "Price Low"
    ? [...byPrice].sort((a, b) => a.price - b.price)
    : initialSortMode === "Price High"
      ? [...byPrice].sort((a, b) => b.price - a.price)
      : byPrice;
  const filtersActive = Boolean(selectedCategory || minPrice || maxPrice || initialSortMode !== "Featured");

  function categoryHref(slug: string) {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);
    if (initialSortMode !== "Featured") params.set("sort", sortParamByMode[initialSortMode]);
    const query = params.toString();
    return query ? `/products?${query}` : "/products";
  }

  return (
    <>
      <PageMotion />
      <section className="page-hero compact page-reveal">
        <p className="section-kicker">Exquisite collections</p>
        <h1>Browse the full Muxcor product framework.</h1>
        <p>Browse our jewelry collections by category. Select a product and send an inquiry for pricing and packing details.</p>
      </section>

      <section className="shop-layout page-reveal" aria-label="Product browsing">
        <aside className="shop-sidebar" aria-label="Product filters">
          <div className="sidebar-heading"><SlidersHorizontal size={19} /><span>Filters</span></div>
          <div className="sidebar-section">
            <h2>Categories</h2>
            <div className="sidebar-category-list" role="list" aria-label="Product category filter">
              <Link className={!selectedCategory ? "active" : ""} aria-current={!selectedCategory ? "page" : undefined} href={categoryHref("")}>
                <span>All jewelry</span><strong>{products.length}</strong>
              </Link>
              {flatCategories.map((item) => (
                <Link
                  key={item.id}
                  className={selectedCategory?.id === item.id ? "active" : ""}
                  aria-current={selectedCategory?.id === item.id ? "page" : undefined}
                  href={categoryHref(item.slug)}
                  style={{ paddingLeft: `${14 + item.depth * 18}px` }}
                >
                  <span>{item.name}</span><strong>{item.productCount}</strong>
                </Link>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h2>Price range</h2>
            <form id="product-filter-form" className="price-filter" action="/products" role="search" aria-label="Price range search">
              {selectedCategory ? <input type="hidden" name="category" value={selectedCategory.slug} /> : null}
              <label>Min<input type="number" min="0" inputMode="numeric" name="min" defaultValue={minPrice} placeholder={formatProductPrice(priceRange.min)} /></label>
              <label>Max<input type="number" min="0" inputMode="numeric" name="max" defaultValue={maxPrice} placeholder={formatProductPrice(priceRange.max)} /></label>
              <div className="price-range-note"><Search size={15} /><span>{formatProductPrice(priceRange.min)} to {formatProductPrice(priceRange.max)}</span></div>
              <button className="apply-filter-button" type="submit">Apply filters</button>
            </form>
          </div>
          <Link className={`clear-filter-button ${filtersActive ? "" : "disabled"}`} href="/products" aria-disabled={!filtersActive}><X size={16} />Clear filters</Link>
        </aside>

        <div className="shop-results">
          <div className="shop-toolbar" aria-label="Product results controls">
            <div className="toolbar-title"><SlidersHorizontal size={19} /><span>{filteredProducts.length} pieces{selectedCategory ? ` in ${selectedCategory.name}` : ""}</span></div>
            <label className="sort-select">Sort<select name="sort" form="product-filter-form" defaultValue={sortParamByMode[initialSortMode]}>{sortModes.map((mode) => <option key={mode} value={sortParamByMode[mode]}>{mode}</option>)}</select></label>
            <button className="sort-apply-button" type="submit" form="product-filter-form">Apply</button>
          </div>
          <section className="product-section listing-section" aria-label="All products">
            <div className="product-grid">
              {filteredProducts.map((product, index) => <ProductCard product={product} motionIndex={index} key={product.id} />)}
              {filteredProducts.length === 0 && <div className="catalog-empty-state"><h2>No products found</h2><p>Try another category or adjust the price range.</p></div>}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
