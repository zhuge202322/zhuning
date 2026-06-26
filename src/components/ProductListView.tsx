import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { PageMotion } from "@/components/PageMotion";
import { ProductCard } from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/storefront-data";

type Category = "All" | StoreProduct["category"];
type SortMode = "Featured" | "Price Low" | "Price High";

const categories: Category[] = ["All", "Necklaces", "Rings"];
const sortModes: SortMode[] = ["Featured", "Price Low", "Price High"];

const sortParamByMode: Record<SortMode, string> = {
  Featured: "featured",
  "Price Low": "price-low",
  "Price High": "price-high",
};

function formatPrice(price: number) {
  return `$${Math.round(price).toLocaleString("en-US")}`;
}

function categoryParam(category: Category) {
  if (category === "Necklaces") return "necklaces";
  if (category === "Rings") return "rings";
  return "";
}

export function ProductListView({
  initialCategory = "All",
  initialMaxPrice = "",
  initialMinPrice = "",
  initialSortMode = "Featured",
  products,
}: {
  initialCategory?: Category;
  initialMaxPrice?: string;
  initialMinPrice?: string;
  initialSortMode?: SortMode;
  products: StoreProduct[];
}) {
  const category = initialCategory;
  const sortMode = initialSortMode;
  const minPrice = initialMinPrice.trim();
  const maxPrice = initialMaxPrice.trim();
  const categoryCounts: Record<Category, number> = {
    All: products.length,
    Necklaces: products.filter((product) => product.category === "Necklaces").length,
    Rings: products.filter((product) => product.category === "Rings").length,
  };
  const prices = products.map((product) => product.price);
  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };
  const byCategory =
    category === "All"
      ? products
      : products.filter((product) => product.category === category);
  const parsedMinPrice = minPrice === "" ? Number.NEGATIVE_INFINITY : Number(minPrice);
  const parsedMaxPrice = maxPrice === "" ? Number.POSITIVE_INFINITY : Number(maxPrice);
  const priceFloor = Number.isFinite(parsedMinPrice) ? parsedMinPrice : Number.NEGATIVE_INFINITY;
  const priceCeiling = Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : Number.POSITIVE_INFINITY;
  const byPrice = byCategory.filter(
    (product) => product.price >= priceFloor && product.price <= priceCeiling,
  );
  const filteredProducts =
    sortMode === "Price Low"
      ? [...byPrice].sort((a, b) => a.price - b.price)
      : sortMode === "Price High"
        ? [...byPrice].sort((a, b) => b.price - a.price)
        : byPrice;

  const filtersActive = category !== "All" || minPrice !== "" || maxPrice !== "" || sortMode !== "Featured";

  function getCategoryHref(nextCategory: Category) {
    const params = new URLSearchParams();
    const nextCategoryParam = categoryParam(nextCategory);
    if (nextCategoryParam) params.set("category", nextCategoryParam);
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);
    if (sortMode !== "Featured") params.set("sort", sortParamByMode[sortMode]);
    const query = params.toString();
    return query ? `/products?${query}` : "/products";
  }

  return (
    <>
      <PageMotion />
      <section className="page-hero compact page-reveal">
        <p className="section-kicker">Exquisite collections</p>
        <h1>Shop rings and necklaces shaped for evening light.</h1>
        <p>
          Browse the Crimson Drop edit from Muxcor: pearl necklaces, rhinestone
          chokers, sculpted bands, and deep red statement rings.
        </p>
      </section>

      <section className="shop-layout page-reveal" aria-label="Product browsing">
        <aside className="shop-sidebar" aria-label="Product filters">
          <div className="sidebar-heading">
            <SlidersHorizontal size={19} />
            <span>Filters</span>
          </div>

          <div className="sidebar-section">
            <h2>Categories</h2>
            <div className="sidebar-category-list" role="list" aria-label="Product category filter">
              {categories.map((item) => (
                <Link
                  key={item}
                  className={category === item ? "active" : ""}
                  aria-current={category === item ? "page" : undefined}
                  href={getCategoryHref(item)}
                >
                  <span>{item === "All" ? "All jewelry" : item}</span>
                  <strong>{categoryCounts[item]}</strong>
                </Link>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h2>Price range</h2>
            <form id="product-filter-form" className="price-filter" action="/products" role="search" aria-label="Price range search">
              {category !== "All" ? <input type="hidden" name="category" value={categoryParam(category)} /> : null}
              <label>
                Min
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  name="min"
                  defaultValue={minPrice}
                  placeholder={formatPrice(priceRange.min)}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  name="max"
                  defaultValue={maxPrice}
                  placeholder={formatPrice(priceRange.max)}
                />
              </label>
              <div className="price-range-note">
                <Search size={15} />
                <span>{formatPrice(priceRange.min)} to {formatPrice(priceRange.max)}</span>
              </div>
              <button className="apply-filter-button" type="submit">
                Apply filters
              </button>
            </form>
          </div>

          <Link className={`clear-filter-button ${filtersActive ? "" : "disabled"}`} href="/products" aria-disabled={!filtersActive}>
            <X size={16} />
            Clear filters
          </Link>
        </aside>

        <div className="shop-results">
          <div className="shop-toolbar" aria-label="Product results controls">
            <div className="toolbar-title">
              <SlidersHorizontal size={19} />
              <span>{filteredProducts.length} pieces</span>
            </div>
            <label className="sort-select">
              Sort
              <select name="sort" form="product-filter-form" defaultValue={sortParamByMode[sortMode]}>
                {sortModes.map((mode) => (
                  <option key={mode} value={sortParamByMode[mode]}>{mode}</option>
                ))}
              </select>
            </label>
            <button className="sort-apply-button" type="submit" form="product-filter-form">
              Apply
            </button>
          </div>

          <section className="product-section listing-section" aria-label="All products">
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard product={product} motionIndex={index} key={product.id} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
