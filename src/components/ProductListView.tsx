import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageMotion } from "@/components/PageMotion";
import { ProductCard } from "@/components/ProductCard";
import { formatProductPrice } from "@/lib/currency";
import { productMatchesCategory, type StoreCategoryNode } from '@/lib/storefront-category';
import { getPaginationItems, paginateProducts } from "@/lib/product-list-core.mjs";
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
  initialPage = "1",
  allProductsLabel = "All products",
  products,
  categories,
}: {
  initialCategorySlug?: string;
  initialMaxPrice?: string;
  initialMinPrice?: string;
  initialSortMode?: SortMode;
  initialPage?: string;
  allProductsLabel?: string;
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
  const pagination = paginateProducts(filteredProducts, Number(initialPage), 20);
  const paginatedProducts = pagination.items as StoreProduct[];
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

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory.slug);
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);
    if (initialSortMode !== "Featured") params.set("sort", sortParamByMode[initialSortMode]);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/products?${query}` : "/products";
  }

  function renderCategoryNode(item: StoreCategoryNode): React.ReactNode {
    const isSelected = selectedCategory?.id === item.id;
    const selectedDescendant = selectedCategory ? item.descendantIds.includes(selectedCategory.id) : false;
    const hasChildren = item.children.length > 0;
    const categoryLink = (
      <Link
        className={`category-tree-link ${isSelected ? "active" : ""}`}
        aria-current={isSelected ? "page" : undefined}
        href={categoryHref(item.slug)}
      >
        <span className="category-link-name">
          {!hasChildren ? <span className="category-depth-marker" aria-hidden="true" /> : null}
          {item.name}
        </span>
        <strong>{item.productCount}</strong>
      </Link>
    );

    if (!hasChildren) {
      return (
        <div className="category-tree-node category-tree-leaf" key={item.id} style={{ "--category-depth": item.depth } as CSSProperties}>
          {categoryLink}
        </div>
      );
    }

    return (
      <div className="category-tree-node category-tree-branch" key={item.id} style={{ "--category-depth": item.depth } as CSSProperties}>
        <details className="category-tree-disclosure" open={selectedDescendant}>
          <summary aria-label={`Toggle ${item.name} subcategories`} />
          <div className="category-tree-children">{item.children.map(renderCategoryNode)}</div>
        </details>
        {categoryLink}
      </div>
    );
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
                <span className="category-link-name"><span className="category-depth-marker" aria-hidden="true" />{allProductsLabel}</span>
                <strong>{products.length}</strong>
              </Link>
              {categories.map(renderCategoryNode)}
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
              {paginatedProducts.map((product, index) => <ProductCard product={product} motionIndex={index} key={product.id} />)}
              {filteredProducts.length === 0 && <div className="catalog-empty-state"><h2>No products found</h2><p>Try another category or adjust the price range.</p></div>}
            </div>
            {filteredProducts.length > 0 ? (
              <nav className="product-pagination" aria-label="Product pages">
                <span className="pagination-summary">Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}</span>
                <div className="pagination-controls">
                  <Link className={pagination.page <= 1 ? "disabled" : ""} aria-disabled={pagination.page <= 1} href={pageHref(Math.max(1, pagination.page - 1))}>Previous</Link>
                  {getPaginationItems(pagination.page, pagination.totalPages).map((item, index) => item === "ellipsis" ? (
                    <span className="pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>...</span>
                  ) : (
                    <Link className={item === pagination.page ? "active" : ""} aria-current={item === pagination.page ? "page" : undefined} href={pageHref(item)} key={item}>{item}</Link>
                  ))}
                  <Link className={pagination.page >= pagination.totalPages ? "disabled" : ""} aria-disabled={pagination.page >= pagination.totalPages} href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}>Next</Link>
                </div>
              </nav>
            ) : null}
          </section>
        </div>
      </section>
    </>
  );
}
