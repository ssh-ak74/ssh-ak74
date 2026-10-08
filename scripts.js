/* ================= DONATION SETTINGS =================
   enabled: false -> hides the Donate section and navigation link.

   Each method has its own enabled flag.
   Replace every YOUR_... value before enabling donations.

   Links must use HTTPS.

   Card + Google Pay should use a hosted checkout link so
   payment/card information never touches this website.
======================================================= */

const DONATIONS = {
  enabled: false,

  methods: {
    card: {
      enabled: true,
      title: 'Card',
      note: 'Visa, Mastercard and more via secure checkout.',
      url: 'https://YOUR_CARD_CHECKOUT_LINK'
    },

    paypal: {
      enabled: true,
      title: 'PayPal',
      note: 'Send any amount with PayPal.',
      url: 'https://paypal.me/YOUR_PAYPAL_NAME'
    },

    googlePay: {
      enabled: true,
      title: 'Google Pay',
      note: 'Pay quickly with Google Pay.',
      url: 'https://YOUR_GOOGLE_PAY_LINK'
    },

    crypto: {
      enabled: true,
      title: 'Crypto',
      note: 'Copy an address and send from your wallet. Double-check the network.',

      wallets: [
        {
          coin: 'Bitcoin',
          network: 'Bitcoin',
          address: 'YOUR_BTC_ADDRESS'
        },
        {
          coin: 'Ethereum',
          network: 'ERC-20',
          address: 'YOUR_ETH_ADDRESS'
        },
        {
          coin: 'USDT',
          network: 'TRC-20',
          address: 'YOUR_USDT_ADDRESS'
        }
      ]
    }
  }
};

/* ================= END SETTINGS ================= */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const toast = message => {
  const t = $('#toast');

  t.textContent = message || 'Copied';
  t.classList.add('show');

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    t.classList.remove('show');
  }, 1500);
};

const copy = async text => {
  if (!text) {
    toast('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    toast('Copy failed');
  }
};

const todo = value => !value || /YOUR_/.test(value);

const el = (tag, cls, text) => {
  const element = document.createElement(tag);

  if (cls) {
    element.className = cls;
  }

  if (text != null) {
    element.textContent = text;
  }

  return element;
};


/* ================= DONATIONS ================= */

function renderDonations() {
  const D = DONATIONS;
  const grid = $('#payGrid');
  const methods = D.methods || {};

  const anyMethodEnabled =
    Object.values(methods).some(method => method && method.enabled);

  if (!D.enabled || !anyMethodEnabled) {
    $('#donate')?.remove();
    $('#navDonate')?.remove();
    return;
  }

  const icons = {
    card: 'CC',
    paypal: 'PP',
    googlePay: 'GP',
    crypto: '₿'
  };

  ['card', 'paypal', 'googlePay'].forEach(key => {
    const method = methods[key];

    if (!method || !method.enabled) {
      return;
    }

    const card = el('div', 'card');
    const button = el(
      'a',
      'btn p',
      'Donate with ' + method.title + ' ↗'
    );

    card.append(
      el('div', 'ic', icons[key]),
      el('h3', '', method.title),
      el('p', '', method.note)
    );

    if (
      todo(method.url) ||
      !/^https:\/\//.test(method.url)
    ) {
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Link not set';

      console.warn(
        'Donations: set a valid HTTPS URL for',
        key
      );
    } else {
      button.href = method.url;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    }

    card.append(button);
    grid.append(card);
  });

  const crypto = methods.crypto;

  if (crypto && crypto.enabled) {
    const card = el('div', 'card f wal');

    card.append(
      el('div', 'ic', icons.crypto),
      el('h3', '', crypto.title),
      el('p', '', crypto.note)
    );

    (crypto.wallets || []).forEach(wallet => {
      const row = el('div', 'wr');

      const name = el('b', '', wallet.coin);
      const network = el('small', '', wallet.network);
      const address = el(
        'code',
        '',
        todo(wallet.address)
          ? 'Address not set'
          : wallet.address
      );

      const button = el('button', 'btn', 'Copy');
      button.type = 'button';

      name.append(network);

      if (todo(wallet.address)) {
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.onclick = () => copy(wallet.address);
      }

      row.append(name, address, button);
      card.append(row);
    });

    grid.append(card);
  }
}

renderDonations();


/* ================= GENERAL UI ================= */

$('#yr').textContent = new Date().getFullYear();


/* Mobile navigation */

const burger = $('#burger');
const links = $('#links');

burger.onclick = () => {
  const open = links.classList.toggle('open');

  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute(
    'aria-label',
    open ? 'Close menu' : 'Open menu'
  );
};

$$('#links a').forEach(link => {
  link.onclick = () => {
    links.classList.remove('open');

    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  };
});


/* Scroll reveal */

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold:0.1
  }
);

$$('.rv').forEach(element => observer.observe(element));


/* Tool tabs */

$$('#tabs button').forEach(button => {
  button.onclick = () => {

    $$('#tabs button').forEach(tab => {
      tab.classList.remove('on');
      tab.setAttribute('aria-selected', 'false');
    });

    $$('.tool').forEach(tool => {
      tool.classList.remove('on');
    });

    button.classList.add('on');
    button.setAttribute('aria-selected', 'true');

    $('#t-' + button.dataset.t).classList.add('on');
  };
});


/* Copy buttons */

$$('[data-copy]').forEach(button => {
  button.onclick = () => {
    const target = $('#' + button.dataset.copy);

    if (target) {
      copy(target.textContent);
    }
  };
});


/* ================= JSON ================= */

const show = (id, value, error = false) => {
  const output = $('#' + id);

  output.textContent = value;
  output.classList.toggle('err', error);
};

const parseJSON = () => {
  try {
    return JSON.parse($('#jin').value);
  } catch (error) {
    show('jout', error.message, true);
    return undefined;
  }
};

$('#jf').onclick = () => {
  const value = parseJSON();

  if (value !== undefined) {
    show(
      'jout',
      JSON.stringify(value, null, 2)
    );
  }
};

$('#jm').onclick = () => {
  const value = parseJSON();

  if (value !== undefined) {
    show(
      'jout',
      JSON.stringify(value)
    );
  }
};


/* ================= BASE64 ================= */

$('#be').onclick = () => {
  try {
    const bytes = new TextEncoder().encode(
      $('#bin').value
    );

    let binary = '';

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    show(
      'bout',
      btoa(binary)
    );
  } catch {
    show(
      'bout',
      'Unable to encode text.',
      true
    );
  }
};

$('#bd').onclick = () => {
  try {
    const binary = atob(
      $('#bin').value.trim()
    );

    const bytes = Uint8Array.from(
      binary,
      character => character.charCodeAt(0)
    );

    show(
      'bout',
      new TextDecoder().decode(bytes)
    );
  } catch {
    show(
      'bout',
      'Invalid Base64.',
      true
    );
  }
};


/* ================= UUID ================= */

const uid = () => crypto.randomUUID();

$('#ug').onclick = () => {
  show('uout', uid());
};

$('#ug10').onclick = () => {
  show(
    'uout',
    Array.from(
      { length:10 },
      uid
    ).join('\n')
  );
};

show('uout', uid());


/* ================= COLOR ================= */

function colorInfo(hex) {

  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    show(
      'cout',
      'Enter a valid #RRGGBB hex color.',
      true
    );

    return;
  }

  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);

  const R = r / 255;
  const G = g / 255;
  const B = b / 255;

  const max = Math.max(R,G,B);
  const min = Math.min(R,G,B);
  const delta = max - min;

  const lightness = (max + min) / 2;

  const saturation = delta
    ? delta / (1 - Math.abs(2 * lightness - 1))
    : 0;

  let hue = 0;

  if (delta) {
    if (max === R) {
      hue = ((G - B) / delta) % 6;
    } else if (max === G) {
      hue = (B - R) / delta + 2;
    } else {
      hue = (R - G) / delta + 4;
    }

    hue = Math.round(
      (hue * 60 + 360) % 360
    );
  }

  show(
    'cout',
    `HEX  ${hex.toLowerCase()}
RGB  rgb(${r}, ${g}, ${b})
HSL  hsl(${hue}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`
  );
}

$('#cp').oninput = event => {
  $('#ch').value = event.target.value;
  colorInfo(event.target.value);
};

$('#ch').oninput = event => {
  colorInfo(event.target.value);

  if (/^#[0-9a-f]{6}$/i.test(event.target.value)) {
    $('#cp').value = event.target.value;
  }
};

colorInfo('#5e6ad2');
