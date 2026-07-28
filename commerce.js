/* =====================================================================
   commerce.js — extension point for Shopify / WooCommerce
   Nothing here is wired up to a real store yet — there isn't one yet.
   This file exists so that when the shop connects to Shopify or
   WooCommerce later, there's exactly one place to plug it in rather
   than hunting through server.js and site.js.

   To connect later:
     1. Set COMMERCE_PROVIDER=shopify (or woocommerce) in .env
     2. Add the platform's API credentials to .env (a Shopify Storefront
        API token, or WooCommerce REST API keys)
     3. Fill in getProductLink() and isConnected() below using that
        platform's SDK/REST API — likely matching gallery items to real
        products via the `sku` field already stored on each item
        (add a SKU when editing a piece in the admin panel).
   Everything else in the app (the shop page, the "Add to Cart" button)
   already checks this module's output and will light up automatically.
   ===================================================================== */

const PROVIDER = process.env.COMMERCE_PROVIDER || 'none'; // 'none' | 'shopify' | 'woocommerce'

function isConnected() {
  // TODO once wired up: actually verify API credentials work, not just
  // that a provider name was set.
  return PROVIDER !== 'none';
}

async function getProductLink(item) {
  // item: { id, alt, caption, price, sku, src, seasonal }
  if (PROVIDER === 'shopify') {
    // TODO: look up item.sku via the Shopify Storefront API and return
    // the real product page URL (or null if no match found).
    return null;
  }
  if (PROVIDER === 'woocommerce') {
    // TODO: look up item.sku via the WooCommerce REST API and return
    // the real product page URL (or null if no match found).
    return null;
  }
  return null;
}

module.exports = { PROVIDER, isConnected, getProductLink };
