// Shopfront — a full-stack e-commerce build project.
//
// This is deliberately more than a single-file exercise: the learner touches
// data modelling, server-side pricing, HTTP APIs, validation, tests, semantic
// HTML, responsive CSS, and browser state. Tests are supplied as the
// specification, so each step is verified by executing real code rather than
// by grepping for a magic line.

const shopfront = {
  id: 'shopfront',
  title: 'Shopfront',
  language: 'javascript',
  level: 'expert',
  summary: 'Build a full-stack storefront: catalog API, server-priced cart, checkout, and a responsive browser UI.',
  brief: 'Model products, price carts on the server, protect stock during checkout, then build a searchable storefront with a persistent cart.',
  concepts: ['node', 'express', 'rest', 'validation', 'testing', 'html', 'css', 'dom', 'localstorage'],
  scaffold: [
    {
      file: 'package.json',
      content: `{
  "name": "shopfront",
  "version": "1.0.0",
  "private": true,
  "description": "A small full-stack storefront for learning HTTP, APIs, and UI state.",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`,
    },
    {
      file: 'data/products.js',
      content: `const products = [
  {
    id: 'mug',
    name: 'Studio Mug',
    category: 'Kitchen',
    priceCents: 1800,
    stock: 8,
    description: 'A heavy stoneware mug with a soft matte glaze.',
  },
  // TODO: add five more products. Vary the category, price, and stock.
];

function findProduct(id) {
  // TODO: return the matching product, or null
}

module.exports = { products, findProduct };
`,
    },
    {
      file: 'lib/cart.js',
      content: `// Server-side cart pricing. The browser never decides the price.
class CartError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'CartError';
    this.status = status;
  }
}

function priceCart(rawItems, products) {
  // TODO: validate the items, look up products, and return
  // { lines, subtotalCents, shippingCents, totalCents }
  throw new CartError('Pricing is not implemented yet.');
}

module.exports = { CartError, priceCart };
`,
    },
    {
      file: 'lib/orders.js',
      content: `const { priceCart } = require('./cart');

let nextOrderNumber = 1001;
const orders = [];

function createOrder(rawItems, products) {
  // TODO: price the cart, reduce product stock, save the order, return it
  throw new Error('Checkout is not implemented yet.');
}

function listOrders() {
  return orders.slice();
}

module.exports = { createOrder, listOrders };
`,
    },
    {
      file: 'server.js',
      content: `const path = require('path');
const express = require('express');
const { products } = require('./data/products');
const { CartError, priceCart } = require('./lib/cart');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // TODO: GET /api/products

  // TODO: POST /api/cart

  // TODO: error handler for CartError, bad JSON, and unexpected failures

  return app;
}

if (require.main === module) {
  createApp().listen(3000, () => {
    console.log('Shopfront running at http://localhost:3000');
  });
}

module.exports = { createApp };
`,
    },
    {
      file: 'public/index.html',
      content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shopfront</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">Shopfront</a>
    <!-- TODO: cart button with a live count -->
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">Small-batch desk goods</p>
      <h1>Things worth keeping on your desk.</h1>
      <p class="hero-copy">A tiny storefront built end to end: catalog, cart, and checkout.</p>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="catalog-head">
        <h2 id="catalog-title">Shop the collection</h2>
        <!-- TODO: search field and category select -->
      </div>
      <!-- TODO: product grid, status region -->
    </section>
  </main>

  <!-- TODO: cart panel with totals, checkout, and confirmation -->
  <script src="/app.js" defer></script>
</body>
</html>
`,
    },
    {
      file: 'public/styles.css',
      content: `:root {
  color-scheme: light;
  --paper: #f6f1e8;
  --ink: #1d1b18;
  --muted: #6e675d;
  --line: #d8cfc1;
  --card: #fffdf8;
  --accent: #b4472d;
  --accent-ink: #fff8f2;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
}

/* TODO: layout, product grid, cart panel, responsive rules */
`,
    },
    {
      file: 'public/app.js',
      content: `// Browser state + fetch calls. The server owns prices and stock.
const CART_KEY = 'shopfront.cart';
const state = { products: [], cart: readCart(), priced: null, lastOrder: null };
const els = {};

function readCart() {
  // TODO: restore a safe cart from localStorage
  return [];
}

function writeCart() {
  // TODO: persist the cart
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

async function loadProducts() {
  // TODO: fetch /api/products, fill categories, render products, refresh cart
}

// TODO: renderProducts, addToCart, refreshCart, renderCart, checkout
// Use textContent (never innerHTML) for product and message text.

loadProducts();
`,
    },
    {
      file: 'demo.js',
      content: `// Optional manual demo. The automated verification lives in test/.
const { createApp } = require('./server');

const server = createApp().listen(0, async () => {
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  try {
    const products = await fetch(base + '/api/products').then((res) => res.json());
    console.log('Products: ' + products.products.length);
    const cart = await fetch(base + '/api/cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 'mug', quantity: 2 }] }),
    }).then((res) => res.json());
    console.log('Cart total: ' + cart.totalCents);
  } finally {
    server.close();
  }
});
`,
    },
    {
      file: 'test/catalog.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { products, findProduct } = require('../data/products');

test('catalog has six products', () => {
  assert.equal(products.length, 6);
});

test('every product has the shape the storefront needs', () => {
  for (const product of products) {
    assert.equal(typeof product.id, 'string');
    assert.equal(typeof product.name, 'string');
    assert.equal(typeof product.category, 'string');
    assert.equal(Number.isInteger(product.priceCents), true, product.id + ' priceCents');
    assert.equal(Number.isInteger(product.stock), true, product.id + ' stock');
    assert.ok(product.description.length > 10, product.id + ' description');
  }
});

test('ids are unique and findProduct works', () => {
  const ids = products.map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(findProduct('mug').name, 'Studio Mug');
  assert.equal(findProduct('missing'), null);
});

test('the catalog includes a sold-out item and more than one category', () => {
  assert.ok(products.some((product) => product.stock === 0));
  assert.ok(new Set(products.map((product) => product.category)).size >= 2);
});
`,
    },
    {
      file: 'test/cart.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { products } = require('../data/products');
const { CartError, priceCart } = require('../lib/cart');

test('prices lines and charges shipping below the free threshold', () => {
  const cart = priceCart([{ id: 'mug', quantity: 2 }], products);
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].lineTotalCents, 3600);
  assert.equal(cart.subtotalCents, 3600);
  assert.equal(cart.shippingCents, 499);
  assert.equal(cart.totalCents, 4099);
});

test('free shipping starts at 5000 cents', () => {
  const cart = priceCart([{ id: 'lamp', quantity: 2 }], products);
  assert.equal(cart.subtotalCents, 6400);
  assert.equal(cart.shippingCents, 0);
  assert.equal(cart.totalCents, 6400);
});

test('rejects empty and malformed carts', () => {
  assert.throws(() => priceCart([], products), CartError);
  assert.throws(() => priceCart([{ id: 'mug', quantity: 0 }], products), CartError);
  assert.throws(() => priceCart([{ id: 'mug', quantity: 1.5 }], products), CartError);
  assert.throws(() => priceCart([{ id: 'missing', quantity: 1 }], products), CartError);
});

test('protects stock', () => {
  assert.throws(() => priceCart([{ id: 'bottle', quantity: 1 }], products), /sold out/i);
  assert.throws(() => priceCart([{ id: 'lamp', quantity: 4 }], products), /only 3/i);
});
`,
    },
    {
      file: 'test/orders.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { products } = require('../data/products');
const { createOrder } = require('../lib/orders');

test('checkout creates an order and reduces stock', () => {
  const before = products.find((product) => product.id === 'notebook').stock;
  const order = createOrder([{ id: 'notebook', quantity: 2 }], products);
  assert.match(order.id, /^SF-\\d+$/);
  assert.equal(order.status, 'confirmed');
  assert.equal(order.totalCents, 2899);
  const after = products.find((product) => product.id === 'notebook').stock;
  assert.equal(after, before - 2);
});

test('a failed checkout does not change stock', () => {
  const before = products.find((product) => product.id === 'bottle').stock;
  assert.throws(() => createOrder([{ id: 'bottle', quantity: 1 }], products));
  const after = products.find((product) => product.id === 'bottle').stock;
  assert.equal(after, before);
});
`,
    },
    {
      file: 'test/api.test.js',
      content: `const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('GET /api/products returns the catalog', async () => {
  const res = await fetch(base + '/api/products');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.products.length, 6);
  assert.equal(data.products[0].id, 'mug');
});

test('POST /api/cart prices items on the server', async () => {
  const res = await fetch(base + '/api/cart', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'mug', quantity: 2 }, { id: 'stickers', quantity: 1 }] }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.subtotalCents, 4200);
  assert.equal(data.shippingCents, 499);
  assert.equal(data.totalCents, 4699);
});

test('POST /api/cart reports stock errors', async () => {
  const res = await fetch(base + '/api/cart', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'bottle', quantity: 1 }] }),
  });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.match(data.error, /sold out/i);
});
`,
    },
    {
      file: 'test/checkout.test.js',
      content: `const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('POST /api/checkout creates an order and reduces stock', async () => {
  const res = await fetch(base + '/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'notebook', quantity: 2 }] }),
  });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.match(order.id, /^SF-\\d+$/);
  assert.equal(order.status, 'confirmed');
  assert.equal(order.totalCents, 2899);

  const catalog = await fetch(base + '/api/products').then((r) => r.json());
  const notebook = catalog.products.find((product) => product.id === 'notebook');
  assert.equal(notebook.stock, 10);
});

test('POST /api/checkout rejects invalid JSON', async () => {
  const res = await fetch(base + '/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(res.status, 400);
});

test('POST /api/checkout rejects sold-out items', async () => {
  const res = await fetch(base + '/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'bottle', quantity: 1 }] }),
  });
  assert.equal(res.status, 409);
});
`,
    },
    {
      file: 'test/markup.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('the page has a catalog, filters, and a status region', () => {
  for (const id of ['product-search', 'category-filter', 'product-grid', 'status']) {
    assert.match(html, new RegExp('id="' + id + '"'), id);
  }
});

test('the page has a complete cart panel', () => {
  for (const id of [
    'cart-panel', 'cart-count', 'cart-items', 'cart-subtotal',
    'cart-shipping', 'cart-total', 'checkout-button', 'clear-cart',
    'order-confirmation',
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'), id);
  }
});

test('the page links the stylesheet and client script', () => {
  assert.match(html, /href="\\/styles\\.css"/);
  assert.match(html, /src="\\/app\\.js"/);
});
`,
    },
    {
      file: 'test/styles.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

test('products use a responsive grid', () => {
  assert.match(css, /\\.product-grid\\s*\\{[^}]*grid-template-columns/);
  assert.match(css, /repeat\\(auto-fit/);
  assert.match(css, /@media/);
});

test('the cart panel has an open state and the page has focus styles', () => {
  assert.match(css, /\\.cart-panel\\.is-open/);
  assert.match(css, /:focus-visible/);
});

test('money and status states are styled', () => {
  assert.match(css, /\\.totals/);
  assert.match(css, /data-tone="error"/);
});
`,
    },
    {
      file: 'test/client.test.js',
      content: `const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('the client uses the catalog, cart, and checkout endpoints', () => {
  assert.match(js, /\\/api\\/products/);
  assert.match(js, /\\/api\\/cart/);
  assert.match(js, /\\/api\\/checkout/);
});

test('the cart survives refreshes', () => {
  assert.match(js, /localStorage/);
  assert.match(js, /shopfront\\.cart/);
});

test('product and message text is rendered safely', () => {
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /innerHTML/);
  assert.match(js, /addEventListener\\('click'/);
});
`,
    },
  ],
  steps: [
    {
      id: 'shop-0-install',
      title: 'Install the project dependencies',
      file: 'package.json',
      task: 'Open the Terminal, make sure you are in the shopfront folder, and run `npm install`. This reads package.json and installs Express. Then press Check step.',
      examples: [
        { label: 'In the Terminal', code: 'npm install' },
        { label: 'Verify Express', code: 'npm ls express --depth=0' },
      ],
      hints: [
        'The Terminal already opens in the build folder.',
        'package.json is part of the scaffold — you do not need npm init.',
        'Check step runs npm ls express for you.',
      ],
      checks: [
        { id: 'has-package-json', type: 'fileExists', file: 'package.json' },
        { id: 'express-installed', type: 'runCommand', command: 'npm ls express --depth=0', expect: 'express', match: 'contains' },
      ],
      solution: `{
  "name": "shopfront",
  "version": "1.0.0",
  "private": true,
  "description": "A small full-stack storefront for learning HTTP, APIs, and UI state.",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`,
    },
    {
      id: 'shop-1-catalog',
      title: 'Model the product catalog',
      file: 'data/products.js',
      task: 'Add five more products so the catalog has six total, with at least two categories and one item at `stock: 0`. Keep prices in integer cents. Finish `findProduct` so it returns the matching product or `null`. Run `node --test test/catalog.test.js` — the catalog tests are your specification.',
      examples: [
        { label: 'A product', code: `{
  id: 'notebook',
  name: 'Dot Grid Notebook',
  category: 'Desk',
  priceCents: 1200,
  stock: 12,
  description: 'A lay-flat notebook with 160 dot-grid pages.',
},` },
        { label: 'Lookup helper', code: `function findProduct(id) {
  return products.find((product) => product.id === id) || null;
}` },
      ],
      hints: [
        'Use short lowercase ids: mug, notebook, tote, stickers, lamp, bottle.',
        'priceCents is the whole price in cents, so $12.00 is 1200.',
        'Test the exact totals the cart tests expect — they depend on these prices.',
      ],
      checks: [
        { id: 'six-products', type: 'fileCount', file: 'data/products.js', pattern: 'id:', atLeast: 6 },
        { id: 'prices-in-cents', type: 'fileCount', file: 'data/products.js', pattern: 'priceCents:', atLeast: 6 },
        { id: 'catalog-tests', type: 'runCommand', command: 'node --test test/catalog.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const products = [
  {
    id: 'mug',
    name: 'Studio Mug',
    category: 'Kitchen',
    priceCents: 1800,
    stock: 8,
    description: 'A heavy stoneware mug with a soft matte glaze.',
  },
  {
    id: 'notebook',
    name: 'Dot Grid Notebook',
    category: 'Desk',
    priceCents: 1200,
    stock: 12,
    description: 'A lay-flat notebook with 160 dot-grid pages.',
  },
  {
    id: 'tote',
    name: 'Canvas Tote',
    category: 'Bags',
    priceCents: 2400,
    stock: 5,
    description: 'A sturdy cotton tote with an inside pocket.',
  },
  {
    id: 'stickers',
    name: 'Sticker Pack',
    category: 'Desk',
    priceCents: 600,
    stock: 20,
    description: 'Twelve weatherproof stickers for laptops and planners.',
  },
  {
    id: 'lamp',
    name: 'Clip Lamp',
    category: 'Desk',
    priceCents: 3200,
    stock: 3,
    description: 'A warm USB clip lamp for late-night reading.',
  },
  {
    id: 'bottle',
    name: 'Steel Bottle',
    category: 'Kitchen',
    priceCents: 2800,
    stock: 0,
    description: 'A vacuum-sealed bottle that keeps water cold all day.',
  },
];

function findProduct(id) {
  return products.find((product) => product.id === id) || null;
}

module.exports = { products, findProduct };
`,
    },
    {
      id: 'shop-2-cart',
      title: 'Price carts on the server',
      file: 'lib/cart.js',
      task: 'Implement `priceCart(rawItems, products)`. Validate that the cart is a non-empty array, every quantity is a whole number from 1 to 10, every product exists, and stock is available. Return `{ lines, subtotalCents, shippingCents, totalCents }`, with free shipping at 5000 cents and 499 cents otherwise. Run `node --test test/cart.test.js`.',
      examples: [
        { label: 'Validate a quantity', code: `const quantity = Number(raw.quantity);
if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
  throw new CartError('Quantity must be a whole number from 1 to 10.');
}` },
        { label: 'Shipping rule', code: `const shippingCents = subtotalCents >= 5000 ? 0 : 499;` },
      ],
      hints: [
        'Throw CartError with status 409 when stock is the problem.',
        'Each line should include id, name, unitPriceCents, quantity, and lineTotalCents.',
        'The tests use the prices from the catalog — if they disagree, re-check data/products.js.',
      ],
      checks: [
        { id: 'has-lines', type: 'fileContains', file: 'lib/cart.js', pattern: 'lineTotalCents', mode: 'string' },
        { id: 'shipping', type: 'fileContains', file: 'lib/cart.js', pattern: 'shippingCents', mode: 'string' },
        { id: 'cart-tests', type: 'runCommand', command: 'node --test test/cart.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `// Server-side cart pricing. The browser never decides the price.
class CartError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'CartError';
    this.status = status;
  }
}

function priceCart(rawItems, products) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new CartError('Your cart is empty.');
  }

  const lines = rawItems.map((raw) => {
    const product = products.find((item) => item.id === raw?.id);
    if (!product) throw new CartError('That product is no longer available.', 404);

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new CartError('Quantity must be a whole number from 1 to 10.');
    }
    if (product.stock === 0) throw new CartError(product.name + ' is sold out.', 409);
    if (quantity > product.stock) {
      throw new CartError('Only ' + product.stock + ' of ' + product.name + ' left.', 409);
    }

    return {
      id: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const shippingCents = subtotalCents >= 5000 ? 0 : 499;

  return {
    lines,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

module.exports = { CartError, priceCart };
`,
    },
    {
      id: 'shop-3-orders',
      title: 'Create orders and protect stock',
      file: 'lib/orders.js',
      task: 'Implement `createOrder(rawItems, products)`: price the cart, reduce each product’s stock, and store an order with a predictable id, a `confirmed` status, a timestamp, and the priced totals. A failed checkout must not change stock. Run `node --test test/orders.test.js`.',
      examples: [
        { label: 'Write the order', code: `const order = {
  id: 'SF-' + nextOrderNumber,
  status: 'confirmed',
  createdAt: new Date().toISOString(),
  ...priced,
};` },
        { label: 'Reduce stock', code: `for (const line of priced.lines) {
  const product = products.find((item) => item.id === line.id);
  product.stock -= line.quantity;
}` },
      ],
      hints: [
        'Call priceCart first — it throws before any stock is touched.',
        'Increment nextOrderNumber only after the order is built.',
        'Store the order in the orders array and return it.',
      ],
      checks: [
        { id: 'confirms-order', type: 'fileContains', file: 'lib/orders.js', pattern: 'confirmed', mode: 'string' },
        { id: 'uses-pricing', type: 'fileContains', file: 'lib/orders.js', pattern: 'priceCart', mode: 'string' },
        { id: 'order-tests', type: 'runCommand', command: 'node --test test/orders.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const { priceCart } = require('./cart');

let nextOrderNumber = 1001;
const orders = [];

function createOrder(rawItems, products) {
  const priced = priceCart(rawItems, products);

  for (const line of priced.lines) {
    const product = products.find((item) => item.id === line.id);
    product.stock -= line.quantity;
  }

  const order = {
    id: 'SF-' + nextOrderNumber,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    ...priced,
  };

  nextOrderNumber += 1;
  orders.push(order);
  return order;
}

function listOrders() {
  return orders.slice();
}

module.exports = { createOrder, listOrders };
`,
    },
    {
      id: 'shop-4-api',
      title: 'Expose the catalog and cart API',
      file: 'server.js',
      task: 'Build the Express app: serve `public/` statically, add `GET /api/products`, add `POST /api/cart` that prices `req.body.items`, and add a four-argument error handler. If the error is a `CartError`, send its status and message; if the JSON body is malformed, send 400. Run `node --test test/api.test.js`.',
      examples: [
        { label: 'Products route', code: `app.get('/api/products', (req, res) => {
  res.json({ products });
});` },
        { label: 'Cart route', code: `app.post('/api/cart', (req, res, next) => {
  try {
    res.json(priceCart(req.body.items, products));
  } catch (err) {
    next(err);
  }
});` },
        { label: 'Error handler', code: `app.use((err, req, res, next) => {
  if (err instanceof CartError) {
    return res.status(err.status).json({ error: err.message });
  }
  res.status(500).json({ error: 'Something went wrong.' });
});` },
      ],
      hints: [
        'express.json() must run before the routes that read req.body.',
        'Error middleware has four parameters — that is how Express recognises it.',
        'Bad JSON arrives with err.type === "entity.parse.failed".',
      ],
      checks: [
        { id: 'products-route', type: 'fileContains', file: 'server.js', pattern: "/api/products", mode: 'string' },
        { id: 'cart-route', type: 'fileContains', file: 'server.js', pattern: "/api/cart", mode: 'string' },
        { id: 'api-tests', type: 'runCommand', command: 'node --test test/api.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const path = require('path');
const express = require('express');
const { products } = require('./data/products');
const { CartError, priceCart } = require('./lib/cart');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/products', (req, res) => {
    res.json({ products });
  });

  app.post('/api/cart', (req, res, next) => {
    try {
      res.json(priceCart(req.body.items, products));
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, next) => {
    if (err instanceof CartError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

if (require.main === module) {
  createApp().listen(3000, () => {
    console.log('Shopfront running at http://localhost:3000');
  });
}

module.exports = { createApp };
`,
    },
    {
      id: 'shop-5-checkout',
      title: 'Add checkout',
      file: 'server.js',
      task: 'Import `createOrder` and add `POST /api/checkout`. It accepts the same `{ items }` body, responds with 201 and the order, and lets the existing error handler report stock or validation problems. Run `node --test test/checkout.test.js`.',
      examples: [
        { label: 'Checkout route', code: `app.post('/api/checkout', (req, res, next) => {
  try {
    res.status(201).json(createOrder(req.body.items, products));
  } catch (err) {
    next(err);
  }
});` },
      ],
      hints: [
        'The order function already prices the cart and reduces stock.',
        'Use 201 Created, not 200.',
        'A sold-out item should come back as 409 through CartError.',
      ],
      checks: [
        { id: 'checkout-route', type: 'fileContains', file: 'server.js', pattern: "/api/checkout", mode: 'string' },
        { id: 'checkout-tests', type: 'runCommand', command: 'node --test test/checkout.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const path = require('path');
const express = require('express');
const { products } = require('./data/products');
const { CartError, priceCart } = require('./lib/cart');
const { createOrder } = require('./lib/orders');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/products', (req, res) => {
    res.json({ products });
  });

  app.post('/api/cart', (req, res, next) => {
    try {
      res.json(priceCart(req.body.items, products));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/checkout', (req, res, next) => {
    try {
      res.status(201).json(createOrder(req.body.items, products));
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, next) => {
    if (err instanceof CartError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

if (require.main === module) {
  createApp().listen(3000, () => {
    console.log('Shopfront running at http://localhost:3000');
  });
}

module.exports = { createApp };
`,
    },
    {
      id: 'shop-6-markup',
      title: 'Build the storefront markup',
      file: 'public/index.html',
      task: 'Create the semantic shell for the store: a header with a cart button and live count, a hero, search and category controls, an empty product grid, a status region, and an accessible cart panel with totals, checkout, clear-cart, and an order confirmation. Run `node --test test/markup.test.js`.',
      examples: [
        { label: 'Cart button', code: `<button id="open-cart" type="button" aria-controls="cart-panel" aria-expanded="false">
  Cart <span id="cart-count">0</span>
</button>` },
        { label: 'Cart totals', code: `<dl class="totals">
  <div><dt>Subtotal</dt><dd id="cart-subtotal">$0.00</dd></div>
  <div><dt>Shipping</dt><dd id="cart-shipping">$0.00</dd></div>
  <div><dt>Total</dt><dd id="cart-total">$0.00</dd></div>
</dl>` },
      ],
      hints: [
        'Every id in test/markup.test.js must exist exactly once.',
        'Use a <label> for the search input and the category select.',
        'The cart panel starts with aria-hidden="true"; app.js opens it.',
      ],
      checks: [
        { id: 'cart-panel', type: 'fileContains', file: 'public/index.html', pattern: 'id="cart-panel"', mode: 'string' },
        { id: 'markup-tests', type: 'runCommand', command: 'node --test test/markup.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shopfront</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">Shopfront</a>
    <button id="open-cart" class="cart-button" type="button" aria-controls="cart-panel" aria-expanded="false">
      Cart <span id="cart-count" class="cart-count">0</span>
    </button>
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">Small-batch desk goods</p>
      <h1>Things worth keeping on your desk.</h1>
      <p class="hero-copy">A tiny storefront built end to end: catalog, cart, and checkout.</p>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="catalog-head">
        <h2 id="catalog-title">Shop the collection</h2>
        <div class="filters">
          <label class="field">
            <span>Search</span>
            <input id="product-search" type="search" placeholder="Search products" autocomplete="off" />
          </label>
          <label class="field">
            <span>Category</span>
            <select id="category-filter">
              <option value="all">All categories</option>
            </select>
          </label>
        </div>
      </div>
      <div id="product-grid" class="product-grid" aria-live="polite"></div>
      <p id="status" class="status" role="status" aria-live="polite"></p>
    </section>
  </main>

  <aside id="cart-panel" class="cart-panel" aria-labelledby="cart-title" aria-hidden="true">
    <div class="cart-head">
      <h2 id="cart-title">Your cart</h2>
      <button id="close-cart" class="link-button" type="button">Close</button>
    </div>
    <div id="cart-items" class="cart-items"></div>
    <dl class="totals">
      <div><dt>Subtotal</dt><dd id="cart-subtotal">$0.00</dd></div>
      <div><dt>Shipping</dt><dd id="cart-shipping">$0.00</dd></div>
      <div class="total-row"><dt>Total</dt><dd id="cart-total">$0.00</dd></div>
    </dl>
    <button id="checkout-button" class="primary" type="button" disabled>Checkout</button>
    <button id="clear-cart" class="link-button" type="button">Clear cart</button>
    <div id="order-confirmation" class="confirmation" hidden></div>
  </aside>

  <script src="/app.js" defer></script>
</body>
</html>
`,
    },
    {
      id: 'shop-7-styles',
      title: 'Style a responsive storefront',
      file: 'public/styles.css',
      task: 'Turn the shell into a real storefront: a warm editorial palette, a responsive product grid using `repeat(auto-fit, ...)`, readable cards, a cart panel that slides in when it has the `is-open` class, clear totals, visible `:focus-visible` states, and a mobile layout. Run `node --test test/styles.test.js`.',
      examples: [
        { label: 'Responsive grid', code: `.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}` },
        { label: 'Open cart', code: `.cart-panel.is-open {
  transform: translateX(0);
}` },
      ],
      hints: [
        'The cart panel needs a closed transform and an .is-open state.',
        'Style [data-tone="error"] so failed actions are visibly different.',
        'Add a media query for narrow screens — the test looks for @media.',
      ],
      checks: [
        { id: 'grid', type: 'fileContains', file: 'public/styles.css', pattern: 'repeat(auto-fit', mode: 'string' },
        { id: 'focus', type: 'fileContains', file: 'public/styles.css', pattern: ':focus-visible', mode: 'string' },
        { id: 'style-tests', type: 'runCommand', command: 'node --test test/styles.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `:root {
  color-scheme: light;
  --paper: #f6f1e8;
  --ink: #1d1b18;
  --muted: #6e675d;
  --line: #d8cfc1;
  --card: #fffdf8;
  --accent: #b4472d;
  --accent-ink: #fff8f2;
  --ok: #2f6b4f;
  --danger: #9d3124;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.5;
}

button, input, select { font: inherit; }

button { cursor: pointer; }

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem;
}

.brand {
  color: var(--ink);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-decoration: none;
}

.cart-button,
.primary {
  border: 1px solid var(--accent);
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  padding: 0.6rem 1rem;
}

.cart-count {
  display: inline-grid;
  min-width: 1.35rem;
  height: 1.35rem;
  margin-left: 0.35rem;
  place-items: center;
  border-radius: 999px;
  background: var(--accent-ink);
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 700;
}

main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.25rem 4rem;
}

.hero {
  max-width: 680px;
  padding: 4rem 0 3rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: var(--accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 4.6rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.98;
}

.hero-copy {
  max-width: 38rem;
  margin: 1.25rem 0 0;
  color: var(--muted);
  font-size: 1.05rem;
}

.catalog-head {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.catalog-head h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.field {
  display: grid;
  gap: 0.3rem;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field input,
.field select {
  min-width: 11rem;
  border: 1px solid var(--line);
  border-radius: 0.55rem;
  background: var(--card);
  color: var(--ink);
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
  letter-spacing: normal;
  text-transform: none;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding-top: 1.5rem;
}

.product-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 1.1rem;
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  background: var(--card);
}

.product-art {
  display: grid;
  height: 8rem;
  margin-bottom: 1rem;
  place-items: center;
  border-radius: 0.65rem;
  background: linear-gradient(135deg, #eadfce, #d6c2a8);
  color: rgba(29, 27, 24, 0.5);
  font-size: 3rem;
}

.product-card h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.product-category {
  margin: 0.25rem 0 0;
  color: var(--accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.product-description {
  flex: 1;
  margin: 0.6rem 0 1rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.price {
  font-size: 1.05rem;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status {
  min-height: 1.5rem;
  margin: 1rem 0 0;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.85rem;
}

.status[data-tone="success"] { color: var(--ok); }
.status[data-tone="error"] { color: var(--danger); }

.cart-panel {
  position: fixed;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: min(24rem, 100%);
  height: 100%;
  padding: 1.25rem;
  border-left: 1px solid var(--line);
  background: var(--card);
  box-shadow: -1rem 0 3rem rgba(29, 27, 24, 0.16);
  overflow-y: auto;
  transform: translateX(105%);
  transition: transform 180ms ease;
}

.cart-panel.is-open { transform: translateX(0); }

.cart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cart-head h2 { margin: 0; font-size: 1.25rem; font-weight: 500; }

.cart-items { display: grid; gap: 0.75rem; }

.cart-line {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
}

.cart-line h3 { margin: 0; font-size: 0.92rem; }
.cart-line .line-price { color: var(--muted); font-size: 0.85rem; }

.quantity {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.quantity button {
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--line);
  border-radius: 0.4rem;
  background: var(--paper);
}

.totals { margin: 0; padding-top: 0.25rem; }
.totals > div { display: flex; justify-content: space-between; padding: 0.2rem 0; }
.totals dt, .totals dd { margin: 0; }
.total-row { margin-top: 0.35rem; border-top: 1px solid var(--line); padding-top: 0.55rem !important; font-weight: 700; }

.primary { width: 100%; border-radius: 0.55rem; }

.link-button {
  border: 0;
  background: none;
  color: var(--muted);
  padding: 0.2rem 0;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.confirmation {
  padding: 0.85rem;
  border: 1px solid #b9d4c3;
  border-radius: 0.6rem;
  background: #eef6f0;
  color: var(--ok);
  font-size: 0.9rem;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

@media (max-width: 620px) {
  .hero { padding-top: 2.5rem; }
  .catalog-head { align-items: stretch; }
  .filters, .field, .field input, .field select { width: 100%; }
  .cart-panel { width: 100%; }
}
`,
    },
    {
      id: 'shop-8-client',
      title: 'Connect the storefront',
      file: 'public/app.js',
      task: 'Implement the browser state: restore and persist the cart in localStorage, fetch products, render searchable/filterable cards with `textContent`, price the cart through `POST /api/cart` after every change, handle quantity changes, and complete checkout through `POST /api/checkout`. Never use innerHTML. Run `node --test test/client.test.js`.',
      examples: [
        { label: 'Safe product card', code: `const title = document.createElement('h3');
title.textContent = product.name;
card.append(title);` },
        { label: 'Server-priced cart', code: `const data = await api('/api/cart', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ items: state.cart }),
});` },
      ],
      hints: [
        'Build one helper that fetches JSON and throws a readable error on a bad status.',
        'After add/remove/quantity, save the cart and call refreshCart().',
        'Disable checkout when the cart is empty, unpriced, or has an error.',
      ],
      checks: [
        { id: 'safe-rendering', type: 'fileContains', file: 'public/app.js', pattern: 'textContent', mode: 'string' },
        { id: 'persists-cart', type: 'fileContains', file: 'public/app.js', pattern: 'localStorage', mode: 'string' },
        { id: 'client-tests', type: 'runCommand', command: 'node --test test/client.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `// Browser state + fetch calls. The server owns prices and stock.
const CART_KEY = 'shopfront.cart';

const state = {
  products: [],
  cart: readCart(),
  priced: null,
  cartError: '',
  lastOrder: null,
};

const els = {
  grid: document.getElementById('product-grid'),
  search: document.getElementById('product-search'),
  category: document.getElementById('category-filter'),
  status: document.getElementById('status'),
  openCart: document.getElementById('open-cart'),
  closeCart: document.getElementById('close-cart'),
  cartPanel: document.getElementById('cart-panel'),
  cartCount: document.getElementById('cart-count'),
  cartItems: document.getElementById('cart-items'),
  subtotal: document.getElementById('cart-subtotal'),
  shipping: document.getElementById('cart-shipping'),
  total: document.getElementById('cart-total'),
  checkout: document.getElementById('checkout-button'),
  clearCart: document.getElementById('clear-cart'),
  confirmation: document.getElementById('order-confirmation'),
};

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => (
      line
      && typeof line.id === 'string'
      && Number.isInteger(line.quantity)
      && line.quantity > 0
    ));
  } catch {
    return [];
  }
}

function writeCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function setStatus(message, tone = '') {
  els.status.textContent = message;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function setCartOpen(open) {
  els.cartPanel.classList.toggle('is-open', open);
  els.cartPanel.setAttribute('aria-hidden', String(!open));
  els.openCart.setAttribute('aria-expanded', String(open));
}

async function api(path, options) {
  const res = await fetch(path, options);
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || 'Request failed with status ' + res.status);
  return data;
}

function renderProducts() {
  const term = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const visible = state.products.filter((product) => {
    const matchesText = !term || (product.name + ' ' + product.description).toLowerCase().includes(term);
    const matchesCategory = category === 'all' || product.category === category;
    return matchesText && matchesCategory;
  });

  els.grid.replaceChildren();
  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'status';
    empty.textContent = 'No products match that search.';
    els.grid.append(empty);
    return;
  }

  for (const product of visible) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const art = document.createElement('div');
    art.className = 'product-art';
    art.setAttribute('aria-hidden', 'true');
    art.textContent = product.name.slice(0, 1);

    const name = document.createElement('h3');
    name.textContent = product.name;

    const categoryLabel = document.createElement('p');
    categoryLabel.className = 'product-category';
    categoryLabel.textContent = product.category;

    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.description;

    const footer = document.createElement('div');
    footer.className = 'product-footer';

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = money(product.priceCents);

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'primary';
    add.textContent = product.stock === 0 ? 'Sold out' : 'Add to cart';
    add.disabled = product.stock === 0;
    add.addEventListener('click', () => addToCart(product.id));

    footer.append(price, add);
    card.append(art, name, categoryLabel, description, footer);
    els.grid.append(card);
  }
}

function fillCategories() {
  const current = els.category.value || 'all';
  const categories = Array.from(new Set(state.products.map((product) => product.category))).sort();
  els.category.replaceChildren();

  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'All categories';
  els.category.append(all);

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    els.category.append(option);
  }

  els.category.value = categories.includes(current) ? current : 'all';
}

async function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product || product.stock === 0) return;

  const line = state.cart.find((item) => item.id === id);
  if (line) {
    if (line.quantity >= product.stock) {
      setStatus('Only ' + product.stock + ' of ' + product.name + ' left.', 'error');
      return;
    }
    line.quantity += 1;
  } else {
    state.cart.push({ id, quantity: 1 });
  }

  writeCart();
  await refreshCart();
  setCartOpen(true);
  setStatus(product.name + ' added to your cart.', 'success');
}

async function changeQuantity(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;

  line.quantity += delta;
  if (line.quantity <= 0) {
    state.cart = state.cart.filter((item) => item.id !== id);
  }
  writeCart();
  await refreshCart();
}

async function removeLine(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  writeCart();
  await refreshCart();
}

async function refreshCart() {
  if (state.cart.length === 0) {
    state.priced = null;
    state.cartError = '';
    renderCart();
    return;
  }

  try {
    const data = await api('/api/cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: state.cart }),
    });
    state.priced = data;
    state.cartError = '';
  } catch (err) {
    state.priced = null;
    state.cartError = err.message;
  }
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  els.cartCount.textContent = String(count);
  els.cartItems.replaceChildren();

  if (state.cart.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'status';
    empty.textContent = 'Your cart is empty.';
    els.cartItems.append(empty);
  }

  for (const line of state.cart) {
    const product = state.products.find((item) => item.id === line.id);
    if (!product) continue;

    const row = document.createElement('div');
    row.className = 'cart-line';

    const title = document.createElement('h3');
    title.textContent = product.name;

    const priced = state.priced?.lines.find((item) => item.id === line.id);
    const linePrice = document.createElement('span');
    linePrice.className = 'line-price';
    linePrice.textContent = priced
      ? money(priced.lineTotalCents)
      : money(product.priceCents * line.quantity);

    const controls = document.createElement('div');
    controls.className = 'quantity';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '-';
    minus.setAttribute('aria-label', 'Remove one ' + product.name);
    minus.addEventListener('click', () => changeQuantity(line.id, -1));

    const amount = document.createElement('span');
    amount.textContent = String(line.quantity);

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Add one ' + product.name);
    plus.addEventListener('click', () => changeQuantity(line.id, 1));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'link-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => removeLine(line.id));

    controls.append(minus, amount, plus, remove);
    row.append(title, linePrice, controls);
    els.cartItems.append(row);
  }

  els.subtotal.textContent = money(state.priced?.subtotalCents || 0);
  els.shipping.textContent = money(state.priced?.shippingCents || 0);
  els.total.textContent = money(state.priced?.totalCents || 0);

  if (state.cartError) {
    const error = document.createElement('p');
    error.className = 'status';
    error.dataset.tone = 'error';
    error.textContent = state.cartError;
    els.cartItems.append(error);
  }

  els.checkout.disabled = state.cart.length === 0 || !state.priced || !!state.cartError;
}

function renderConfirmation(order) {
  els.confirmation.hidden = false;
  els.confirmation.replaceChildren();

  const title = document.createElement('strong');
  title.textContent = 'Order ' + order.id + ' confirmed';

  const detail = document.createElement('p');
  detail.textContent = 'Total ' + money(order.totalCents) + '. Thanks for shopping.';

  els.confirmation.append(title, detail);
}

async function checkout() {
  if (state.cart.length === 0) return;
  els.checkout.disabled = true;
  setStatus('Placing your order...');

  try {
    const order = await api('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: state.cart }),
    });
    state.lastOrder = order;
    state.cart = [];
    writeCart();
    await refreshCart();
    renderConfirmation(order);
    setStatus('Order confirmed.', 'success');
    const catalog = await api('/api/products');
    state.products = catalog.products;
    renderProducts();
  } catch (err) {
    setStatus(err.message, 'error');
    els.checkout.disabled = false;
  }
}

async function loadProducts() {
  try {
    const data = await api('/api/products');
    state.products = data.products;
    fillCategories();
    renderProducts();
    await refreshCart();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

els.search.addEventListener('input', renderProducts);
els.category.addEventListener('change', renderProducts);
els.checkout.addEventListener('click', checkout);
els.openCart.addEventListener('click', () => setCartOpen(true));
els.closeCart.addEventListener('click', () => setCartOpen(false));
els.clearCart.addEventListener('click', () => {
  state.cart = [];
  writeCart();
  refreshCart();
  setStatus('Cart cleared.');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setCartOpen(false);
});

loadProducts();
`,
    },
    {
      id: 'shop-9-suite',
      title: 'Run the whole suite',
      file: 'package.json',
      task: 'Everything should now work together. Press Check step to run `npm test` — all catalog, cart, order, API, checkout, markup, style, and client tests must pass.',
      examples: [
        { label: 'Run everything', code: 'npm test' },
        { label: 'Start the store', code: 'npm start' },
      ],
      hints: [
        'If one file fails, open its test output and fix the source file it names.',
        'The smoke demo is optional: node demo.js.',
      ],
      checks: [
        { id: 'full-suite', type: 'runCommand', command: 'npm test', expect: '# fail 0', match: 'contains' },
      ],
    },
  ],
  reflectionPrompt: 'Why must the server calculate the total and reduce stock, instead of trusting the browser cart?',
};

export default shopfront;
