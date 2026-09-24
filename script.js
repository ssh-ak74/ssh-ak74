const isMobile =
    window.innerWidth < 768 ||
    /Mobi|Android/i.test(navigator.userAgent);

/* =========================================================
   SMOKE WEBGL EFFECT
   ========================================================= */

class Smoke {
    constructor(canvas) {
        this.c = canvas;

        const gl = canvas.getContext("webgl2");
        if (!gl) return;

        this.gl = gl;
        this.color = [1, 1, 1];

        this._build();
        this._buf();
    }

    _build() {
        const gl = this.gl;

        const vs = `#version 300 es
precision highp float;

in vec4 position;

void main() {
    gl_Position = position;
}`;

        const fs = `#version 300 es
precision highp float;

out vec4 O;

uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time + 660.)

float rnd(vec2 p) {
    p = fract(p * vec2(12.9898, 78.233));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(rnd(i), rnd(i + vec2(1, 0)), u.x),
        mix(rnd(i + vec2(0, 1)), rnd(i + 1.0), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float t = 0.0;
    float a = 1.0;

    for (int i = 0; i < 5; i++) {
        t += a * noise(p);
        p *= mat2(1, -1.2, 0.2, 1.2) * 2.0;
        a *= 0.5;
    }

    return t;
}

void main() {
    vec2 uv = (FC - 0.5 * R) / R.y;
    vec3 col = vec3(1.0);

    float ar = R.x / max(R.y, 1.0);

    float ox = mix(
        0.08,
        0.25,
        smoothstep(0.65, 1.2, ar)
    );

    float sx = mix(
        1.2,
        2.0,
        smoothstep(0.65, 1.2, ar)
    );

    uv.x += ox;
    uv *= vec2(sx, 1.0);

    float n = fbm(
        uv * 0.28 - vec2(T * 0.01, 0.0)
    );

    n = noise(uv * 3.0 + n * 2.0);

    col.r -= fbm(
        uv + vec2(0.0, T * 0.015) + n
    );

    col.g -= fbm(
        uv * 1.003 +
        vec2(0.0, T * 0.015) +
        n +
        0.003
    );

    col.b -= fbm(
        uv * 1.006 +
        vec2(0.0, T * 0.015) +
        n +
        0.006
    );

    float m = clamp(
        dot(col, vec3(0.21, 0.71, 0.07)),
        0.0,
        1.0
    );

    col = mix(vec3(0.0), u_color, m);
    col *= min(time * 0.3, 1.0);
    col = clamp(col, 0.0, 1.0);

    O = vec4(col, 1.0);
}`;

        const vs2 = gl.createShader(gl.VERTEX_SHADER);
        const fs2 = gl.createShader(gl.FRAGMENT_SHADER);

        gl.shaderSource(vs2, vs);
        gl.compileShader(vs2);

        gl.shaderSource(fs2, fs);
        gl.compileShader(fs2);

        if (!gl.getShaderParameter(vs2, gl.COMPILE_STATUS)) {
            console.error(
                "Smoke vertex shader error:",
                gl.getShaderInfoLog(vs2)
            );
        }

        if (!gl.getShaderParameter(fs2, gl.COMPILE_STATUS)) {
            console.error(
                "Smoke fragment shader error:",
                gl.getShaderInfoLog(fs2)
            );
        }

        const p = gl.createProgram();

        gl.attachShader(p, vs2);
        gl.attachShader(p, fs2);
        gl.linkProgram(p);

        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(
                "Smoke program error:",
                gl.getProgramInfoLog(p)
            );
        }

        this.prog = p;

        this.uR = gl.getUniformLocation(
            p,
            "resolution"
        );

        this.uT = gl.getUniformLocation(
            p,
            "time"
        );

        this.uC = gl.getUniformLocation(
            p,
            "u_color"
        );
    }

    _buf() {
        const gl = this.gl;
        const p = this.prog;

        if (!p) return;

        const b = gl.createBuffer();

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            b
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, 1,
                -1, -1,
                1, 1,
                1, -1
            ]),
            gl.STATIC_DRAW
        );

        const a = gl.getAttribLocation(
            p,
            "position"
        );

        gl.enableVertexAttribArray(a);

        gl.vertexAttribPointer(
            a,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );
    }

    resize() {
        const dpr = Math.min(
            1.5,
            window.devicePixelRatio || 1
        );

        this.c.width = Math.floor(
            this.c.clientWidth * dpr
        );

        this.c.height = Math.floor(
            this.c.clientHeight * dpr
        );

        if (this.gl) {
            this.gl.viewport(
                0,
                0,
                this.c.width,
                this.c.height
            );
        }
    }

    render(t) {
        const gl = this.gl;

        if (!gl || !this.prog) return;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.prog);

        gl.uniform2f(
            this.uR,
            this.c.width,
            this.c.height
        );

        gl.uniform1f(
            this.uT,
            t * 0.001
        );

        gl.uniform3fv(
            this.uC,
            this.color
        );

        gl.drawArrays(
            gl.TRIANGLE_STRIP,
            0,
            4
        );
    }
}

function startSmoke(canvas, hex) {
    if (!canvas) return null;

    let sm;

    try {
        sm = new Smoke(canvas);
    } catch (e) {
        console.error("Smoke initialization failed:", e);
        return null;
    }

    if (!sm.gl) return null;

    if (hex) {
        const m =
            /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

        if (m) {
            sm.color = [
                parseInt(m[1], 16) / 255,
                parseInt(m[2], 16) / 255,
                parseInt(m[3], 16) / 255
            ];
        }
    }

    sm.resize();

    let raf;
    let t0 = 0;

    const tick = (t) => {
        if (!t0) t0 = t;

        sm.render(t - t0);

        raf = requestAnimationFrame(tick);
    };

    window.addEventListener(
        "resize",
        () => sm.resize()
    );

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
}

let entClean = null;

if (!isMobile) {
    const enterCanvas =
        document.getElementById("enter-canvas");

    if (enterCanvas) {
        entClean = startSmoke(
            enterCanvas,
            "#ffffff"
        );
    }
}

/* =========================================================
   LENIS
   ========================================================= */

if (typeof Lenis !== "undefined") {
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) =>
            Math.min(
                1,
                1.001 - Math.pow(2, -10 * t)
            ),
        smoothWheel: true
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}

/* =========================================================
   ENTER SCREEN
   ========================================================= */

const enterScreen =
    document.getElementById("enter-screen");

if (enterScreen) {
    enterScreen.addEventListener(
        "click",
        function () {
            const bgVideo =
                document.getElementById("bg-video");

            if (bgVideo) {
                bgVideo
                    .play()
                    .catch(() => {});
            }

            this.classList.add("leaving");

            const dur = isMobile
                ? 450
                : 800;

            setTimeout(() => {
                this.style.display = "none";

                if (entClean) {
                    entClean();
                }

                const main =
                    document.getElementById("main");

                const player =
                    document.getElementById("player");

                if (main) {
                    main.classList.add("visible");
                }

                if (player) {
                    player.style.display = "";
                }

                initScrollReveal();
            }, dur);
        }
    );
}

/* =========================================================
   SCROLL REVEAL
   ========================================================= */

function initScrollReveal() {
    const els =
        document.querySelectorAll(".reveal");

    if (!els.length) return;

    const obs =
        new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add(
                            "visible"
                        );

                        obs.unobserve(e.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin:
                    "0px 0px -40px 0px"
            }
        );

    els.forEach((el) => obs.observe(el));
}

/* =========================================================
   SKILLS
   ========================================================= */

const skills = [
    {
        n: "HTML",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg"
    },
    {
        n: "CSS",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg"
    },
    {
        n: "JavaScript",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg"
    },
    {
        n: "Tailwind CSS",
        i: "https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg"
    },
    {
        n: "PHP",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg"
    },
    {
        n: "Python",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
    },
    {
        n: "Lua",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/lua/lua-original.svg"
    },
    {
        n: "Node.js",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg"
    },
    {
        n: "C#",
        i: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
    }
];

const sg =
    document.getElementById("skills-grid");

if (sg) {
    skills.forEach((s) => {
        sg.insertAdjacentHTML(
            "beforeend",
            `
            <div class="sk">
                <img
                    src="${s.i}"
                    alt="${s.n}"
                    loading="lazy"
                >
                <span>${s.n}</span>
            </div>
            `
        );
    });
}

/* =========================================================
   TABS
   ========================================================= */

function switchTab(id, btn) {
    document
        .querySelectorAll(".tool-panel")
        .forEach((p) =>
            p.classList.remove("active")
        );

    document
        .querySelectorAll(
            "#tools .tab-btn"
        )
        .forEach((b) =>
            b.classList.remove("active")
        );

    const panel =
        document.getElementById(
            "panel-" + id
        );

    if (panel) {
        panel.classList.add("active");
    }

    if (btn) {
        btn.classList.add("active");
    }
}

function switchPricingTab(id, btn) {
    document
        .querySelectorAll(".pricing-panel")
        .forEach((p) => {
            p.style.display = "none";
        });

    const bar =
        btn?.closest(".tab-bar");

    if (bar) {
        bar
            .querySelectorAll(".tab-btn")
            .forEach((b) =>
                b.classList.remove("active")
            );
    }

    if (btn) {
        btn.classList.add("active");
    }

    const el =
        document.getElementById(
            "price-" + id
        );

    if (el) {
        el.style.display = "block";
    }
}

document
    .querySelectorAll(".pricing-panel")
    .forEach((p, i) => {
        p.style.display =
            i === 0
                ? "block"
                : "none";
    });

/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(msg = "Copied!") {
    const t =
        document.getElementById("toast");

    if (!t) return;

    t.textContent = msg;
    t.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(
        () => t.classList.remove("show"),
        2000
    );
}

/* =========================================================
   IP LOOKUP
   ========================================================= */

const ipCache = {};
let lastIPData = null;

async function lookupIP() {
    const input =
        document.getElementById("ipInput");

    const status =
        document.getElementById("ipStatus");

    const output =
        document.getElementById("ipOutput");

    const map =
        document.getElementById("ipMap");

    const actions =
        document.getElementById("ipActions");

    if (!input || !status || !output) {
        return;
    }

    const value =
        input.value.trim();

    const key =
        value || "__self__";

    if (ipCache[key]) {
        renderIPData(
            ipCache[key]
        );
        return;
    }

    output.innerHTML = "";

    if (map) {
        map.innerHTML = "";
    }

    if (actions) {
        actions.style.display = "none";
    }

    status.innerHTML = "";

    try {
        const response =
            await fetch(
                `lookup.php?lookup=${encodeURIComponent(value)}`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        lastIPData = data;

        if (data.success) {
            ipCache[key] = data;
        }

        renderIPData(data);
    } catch (error) {
        console.error(
            "IP lookup failed:",
            error
        );

        status.innerHTML =
            "⚠ Error fetching data.";
    }
}

function renderIPData(data) {
    const input =
        document.getElementById("ipInput");

    const status =
        document.getElementById("ipStatus");

    const output =
        document.getElementById("ipOutput");

    const map =
        document.getElementById("ipMap");

    const actions =
        document.getElementById("ipActions");

    if (!status || !output) return;

    output.innerHTML = "";

    if (map) {
        map.innerHTML = "";
    }

    if (!data.success) {
        status.innerHTML =
            "⚠ " +
            (data.error ||
                "Lookup failed.");

        return;
    }

    lastIPData = data;

    if (actions) {
        actions.style.display = "flex";
    }

    status.innerHTML = `
        <strong>
            ${escapeHTML(data.country || "Unknown")}
        </strong>
        &nbsp;(${escapeHTML(
            data.ip ||
                input?.value.trim() ||
                ""
        )})
    `;

    if (data.country_code) {
        const f =
            document.createElement("img");

        f.src =
            `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`;

        f.className = "flag";

        status.appendChild(f);
    }

    const fields = {
        IP: data.ip,
        Type: data.type,
        Continent: data.continent,
        Country: data.country,
        Region: data.region,
        City: data.city,
        Latitude: data.latitude,
        Longitude: data.longitude,
        Timezone: data.timezone?.id,
        UTC: data.timezone?.utc,
        ISP: data.connection?.isp,
        ASN: data.connection?.asn,
        Org: data.connection?.org,
        Hosting: data.connection?.hosting,
        Proxy: data.proxy
    };

    for (const key in fields) {
        if (
            fields[key] === undefined ||
            fields[key] === null
        ) {
            continue;
        }

        const raw = fields[key];

        let val =
            escapeHTML(String(raw));

        if (
            key === "Proxy" ||
            key === "Hosting"
        ) {
            val = raw
                ? `TRUE <span class="badge risk">RISK</span>`
                : `FALSE <span class="badge safe">SAFE</span>`;
        }

        const card =
            document.createElement("div");

        card.className = "ip-card";

        card.innerHTML = `
            <button
                class="ip-copy"
                type="button"
            >
                COPY
            </button>

            <strong>
                ${escapeHTML(key)}
            </strong>

            <span class="val">
                ${val}
            </span>
        `;

        const copyBtn =
            card.querySelector(".ip-copy");

        copyBtn.addEventListener(
            "click",
            () => {
                navigator.clipboard
                    .writeText(String(raw))
                    .then(() =>
                        showToast()
                    )
                    .catch(() => {});
            }
        );

        output.appendChild(card);
    }

    if (
        data.latitude !== undefined &&
        data.longitude !== undefined &&
        map
    ) {
        map.innerHTML = `
            <iframe
                width="100%"
                height="240"
                frameborder="0"
                style="border:0"
                src="https://maps.google.com/maps?q=${encodeURIComponent(
                    data.latitude
                )},${encodeURIComponent(
                    data.longitude
                )}&z=12&output=embed"
                allowfullscreen
                loading="lazy"
            ></iframe>
        `;
    }
}

function copyJSON() {
    if (!lastIPData) return;

    navigator.clipboard
        .writeText(
            JSON.stringify(
                lastIPData,
                null,
                2
            )
        )
        .then(() =>
            showToast("JSON copied!")
        )
        .catch(() => {});
}

function downloadJSON() {
    if (!lastIPData) return;

    const b = new Blob(
        [
            JSON.stringify(
                lastIPData,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const u =
        URL.createObjectURL(b);

    const a =
        document.createElement("a");

    a.href = u;

    a.download =
        `lookup_${
            lastIPData.ip ||
            "unknown"
        }.json`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(u);
}

(function () {
    const p =
        new URLSearchParams(
            window.location.search
        );

    const q = p.get("lookup");

    if (q) {
        const input =
            document.getElementById(
                "ipInput"
            );

        if (input) {
            input.value = q;
            lookupIP();
        }
    }
})();

/* =========================================================
   COLOR TOOL
   ========================================================= */

const colorPicker =
    document.getElementById(
        "colorPicker"
    );

const hexManual =
    document.getElementById(
        "hexManual"
    );

let currentGradient = "";

function h2r(hex) {
    return {
        r: parseInt(
            hex.substr(1, 2),
            16
        ),
        g: parseInt(
            hex.substr(3, 2),
            16
        ),
        b: parseInt(
            hex.substr(5, 2),
            16
        )
    };
}

function toHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const mx =
        Math.max(r, g, b);

    const mn =
        Math.min(r, g, b);

    let h;
    let s;

    const l =
        (mx + mn) / 2;

    if (mx === mn) {
        h = 0;
        s = 0;
    } else {
        const d = mx - mn;

        s =
            l > 0.5
                ? d / (2 - mx - mn)
                : d / (mx + mn);

        switch (mx) {
            case r:
                h =
                    (g - b) /
                        d +
                    (g < b ? 6 : 0);
                break;

            case g:
                h =
                    (b - r) /
                        d +
                    2;
                break;

            case b:
                h =
                    (r - g) /
                        d +
                    4;
                break;
        }

        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function toHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const mx =
        Math.max(r, g, b);

    const mn =
        Math.min(r, g, b);

    const d = mx - mn;

    let h;

    if (d === 0) {
        h = 0;
    } else if (mx === r) {
        h =
            ((g - b) / d) % 6;
    } else if (mx === g) {
        h =
            (b - r) / d + 2;
    } else {
        h =
            (r - g) / d + 4;
    }

    h = Math.round(h * 60);

    if (h < 0) {
        h += 360;
    }

    return {
        h,
        s: Math.round(
            mx === 0
                ? 0
                : (d / mx) * 100
        ),
        v: Math.round(mx * 100)
    };
}

function toCmyk(r, g, b) {
    let c = 1 - r / 255;
    let m = 1 - g / 255;
    let y = 1 - b / 255;

    const k =
        Math.min(c, m, y);

    c =
        (c - k) /
            (1 - k) ||
        0;

    m =
        (m - k) /
            (1 - k) ||
        0;

    y =
        (y - k) /
            (1 - k) ||
        0;

    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

function lum(r, g, b) {
    const a = [r, g, b].map(
        (v) => {
            v /= 255;

            return v <= 0.03928
                ? v / 12.92
                : Math.pow(
                      (v + 0.055) /
                          1.055,
                      2.4
                  );
        }
    );

    return (
        0.2126 * a[0] +
        0.7152 * a[1] +
        0.0722 * a[2]
    );
}

function cr(l1, l2) {
    return (
        (
            (Math.max(l1, l2) + 0.05) /
            (Math.min(l1, l2) + 0.05)
        ).toFixed(2)
    );
}

function updateColor(hex) {
    if (
        !/^#[0-9a-f]{6}$/i.test(hex)
    ) {
        return;
    }

    if (colorPicker) {
        colorPicker.value = hex;
    }

    if (hexManual) {
        hexManual.value = hex;
    }

    const preview =
        document.getElementById(
            "colorPreview"
        );

    if (preview) {
        preview.style.background =
            hex;
    }

    const { r, g, b } =
        h2r(hex);

    const hsl =
        toHsl(r, g, b);

    const hsv =
        toHsv(r, g, b);

    const cmyk =
        toCmyk(r, g, b);

    const setValue = (
        id,
        value
    ) => {
        const el =
            document.getElementById(id);

        if (el) {
            el.value = value;
        }
    };

    setValue("fHex", hex);

    setValue(
        "fRgb",
        `rgb(${r}, ${g}, ${b})`
    );

    setValue(
        "fRgba",
        `rgba(${r}, ${g}, ${b}, 1)`
    );

    setValue(
        "fArgb",
        `#FF${hex
            .slice(1)
            .toUpperCase()}`
    );

    setValue(
        "fHsl",
        `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    );

    setValue(
        "fHsv",
        `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`
    );

    setValue(
        "fCmyk",
        `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`
    );

    const twBox =
        document.getElementById(
            "twBox"
        );

    if (twBox) {
        twBox.innerText =
            `bg-[${hex}]
text-[${hex}]
border-[${hex}]`;
    }

    const l =
        lum(r, g, b);

    const cs1 =
        document.getElementById(
            "cs1"
        );

    const cs2 =
        document.getElementById(
            "cs2"
        );

    const csInfo =
        document.getElementById(
            "csInfo"
        );

    if (cs1) {
        cs1.style.background =
            hex;

        cs1.style.color =
            l > 0.179
                ? "#000"
                : "#fff";
    }

    if (cs2) {
        cs2.style.background =
            "#111";

        cs2.style.color =
            hex;
    }

    if (csInfo) {
        csInfo.innerHTML = `
            vs White:
            <strong>${cr(1, l)}:1</strong>
            &nbsp;|&nbsp;
            vs Black:
            <strong>${cr(l, 0)}:1</strong>
        `;
    }
}

if (colorPicker) {
    colorPicker.addEventListener(
        "input",
        (e) =>
            updateColor(
                e.target.value
            )
    );
}

if (hexManual) {
    hexManual.addEventListener(
        "input",
        (e) => {
            let v =
                e.target.value.trim();

            if (!v.startsWith("#")) {
                v = "#" + v;
            }

            if (
                /^#[0-9a-f]{6}$/i.test(v)
            ) {
                updateColor(v);
            }
        }
    );
}

function rndHex() {
    return (
        "#" +
        Math.floor(
            Math.random() *
                16777215
        )
            .toString(16)
            .padStart(6, "0")
    );
}

function genPalette() {
    for (let i = 1; i <= 5; i++) {
        const c = rndHex();

        const el =
            document.getElementById(
                "p" + i
            );

        if (!el) continue;

        el.style.background = c;
        el.title = c;

        el.onclick = () =>
            updateColor(c);
    }
}

function genGradient() {
    const c1 = rndHex();
    const c2 = rndHex();

    currentGradient =
        `linear-gradient(90deg, ${c1}, ${c2})`;

    const bar =
        document.getElementById(
            "gradientBar"
        );

    if (bar) {
        bar.style.background =
            currentGradient;
    }
}

function cpGradient() {
    if (!currentGradient) {
        showToast(
            "Generate one first!"
        );
        return;
    }

    navigator.clipboard
        .writeText(
            "background: " +
                currentGradient +
                ";"
        )
        .then(() =>
            showToast(
                "Gradient CSS copied!"
            )
        )
        .catch(() => {});
}

function cpCSSVar() {
    const hex =
        document.getElementById(
            "fHex"
        )?.value || "";

    navigator.clipboard
        .writeText(
            `:root { --primary: ${hex}; }`
        )
        .then(() =>
            showToast(
                "CSS var copied!"
            )
        )
        .catch(() => {});
}

function cpField(id, btn) {
    const el =
        document.getElementById(id);

    if (!el) return;

    navigator.clipboard
        .writeText(el.value)
        .then(() => {
            const original =
                btn.textContent;

            btn.textContent = "✓";
            btn.classList.add("ok");

            setTimeout(() => {
                btn.textContent =
                    original;

                btn.classList.remove(
                    "ok"
                );
            }, 1400);
        })
        .catch(() => {});
}

if (colorPicker) {
    genPalette();
    genGradient();
    updateColor(
        colorPicker.value
    );
}

/* =========================================================
   JSON TOOL
   ========================================================= */

let parsedJSON = null;

function jsonStatus(
    msg,
    ok = true
) {
    const el =
        document.getElementById(
            "jsonStatus"
        );

    if (!el) return;

    el.innerHTML = `
        <span style="color:${
            ok
                ? "#4ade80"
                : "#f87171"
        }">
            ${msg}
        </span>
    `;
}

function getJsonInput() {
    return (
        document.getElementById(
            "jsonInput"
        )?.value.trim() || ""
    );
}

function syntaxHL(json) {
    const escaped =
        escapeHTML(json);

    return escaped.replace(
        /(&quot;(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^&quot;])*&quot;)(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
        (m, stringValue, colon, boolNull) => {
            let cls = "num";

            if (stringValue) {
                cls = colon
                    ? "key"
                    : "str";
            } else if (
                /true|false/.test(
                    boolNull || ""
                )
            ) {
                cls = "bool";
            } else if (
                /null/.test(
                    boolNull || ""
                )
            ) {
                cls = "null";
            }

            return `
                <span class="${cls}">
                    ${m}
                </span>
            `;
        }
    );
}

function showJsonOut(str) {
    const o =
        document.getElementById(
            "jsonOutput"
        );

    if (!o) return;

    o.style.display = "block";
    o.innerHTML =
        syntaxHL(str);
}

function jsonFormat() {
    try {
        const parsed =
            JSON.parse(
                getJsonInput()
            );

        parsedJSON = parsed;

        showJsonOut(
            JSON.stringify(
                parsed,
                null,
                2
            )
        );

        renderJSONTree(parsed);

        const ts =
            document.getElementById(
                "jsonTS"
            );

        if (ts) {
            ts.style.display =
                "none";
        }

        jsonStatus(
            "✓ Valid JSON — formatted"
        );
    } catch (e) {
        jsonStatus(
            "✗ " + e.message,
            false
        );
    }
}

function jsonMinify() {
    try {
        const parsed =
            JSON.parse(
                getJsonInput()
            );

        parsedJSON = parsed;

        showJsonOut(
            JSON.stringify(parsed)
        );

        const tree =
            document.getElementById(
                "jsonTree"
            );

        if (tree) {
            tree.innerHTML = "";
        }

        jsonStatus(
            "✓ Minified"
        );
    } catch (e) {
        jsonStatus(
            "✗ " + e.message,
            false
        );
    }
}

function jsonValidate() {
    try {
        JSON.parse(
            getJsonInput()
        );

        jsonStatus(
            "✓ Valid JSON"
        );
    } catch (e) {
        jsonStatus(
            "✗ " + e.message,
            false
        );
    }
}

function copyJsonOut() {
    const out =
        document.getElementById(
            "jsonOutput"
        );

    if (!out) return;

    navigator.clipboard
        .writeText(
            out.innerText
        )
        .then(() => showToast())
        .catch(() => {});
}

function jsonSearchRun() {
    const q =
        document.getElementById(
            "jsonSearch"
        )?.value
            .toLowerCase()
            .trim();

    const o =
        document.getElementById(
            "jsonOutput"
        );

    if (!q || !parsedJSON || !o) {
        return;
    }

    const str =
        JSON.stringify(
            parsedJSON,
            null,
            2
        );

    const safeQ =
        q.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

    o.style.display = "block";

    o.innerHTML =
        syntaxHL(str).replace(
            new RegExp(
                `(${safeQ})`,
                "gi"
            ),
            `<span class="highlight">$1</span>`
        );
}

function copyJsonTS() {
    const el =
        document.getElementById(
            "jsonTSOut"
        );

    if (!el) return;

    navigator.clipboard
        .writeText(
            el.innerText
        )
        .then(() => showToast())
        .catch(() => {});
}

function jsonToTS() {
    try {
        const parsed =
            JSON.parse(
                getJsonInput()
            );

        const ts =
            buildTS(
                parsed,
                "Root"
            );

        const box =
            document.getElementById(
                "jsonTS"
            );

        const out =
            document.getElementById(
                "jsonTSOut"
            );

        if (box) {
            box.style.display =
                "block";
        }

        if (out) {
            out.textContent = ts;
        }

        jsonStatus(
            "✓ TypeScript interface generated"
        );
    } catch (e) {
        jsonStatus(
            "✗ " + e.message,
            false
        );
    }
}

function buildTS(
    obj,
    name,
    depth = 0,
    seen = new Set()
) {
    if (
        typeof obj !== "object" ||
        obj === null
    ) {
        return `type ${name} = ${tsType(
            obj,
            name,
            depth,
            seen
        )};`;
    }

    if (Array.isArray(obj)) {
        const item = obj[0];

        const inner =
            typeof item === "object" &&
            item !== null
                ? buildTS(
                      item,
                      name + "Item",
                      depth,
                      seen
                  )
                : "";

        return (
            (inner
                ? inner + "\n"
                : "") +
            `interface ${name} extends Array<${tsType(
                item,
                name + "Item",
                depth,
                seen
            )}> {}`
        );
    }

    if (seen.has(obj)) {
        return "";
    }

    seen.add(obj);

    let out =
        `interface ${name} {\n`;

    const nested = [];

    for (const k in obj) {
        const v = obj[k];

        const t = tsType(
            v,
            cap(k),
            depth + 1,
            seen
        );

        out += `  ${k}: ${t};\n`;

        if (
            typeof v === "object" &&
            v !== null &&
            !Array.isArray(v)
        ) {
            nested.push(
                buildTS(
                    v,
                    cap(k),
                    depth + 1,
                    seen
                )
            );
        }

        if (
            Array.isArray(v) &&
            typeof v[0] === "object" &&
            v[0] !== null
        ) {
            nested.push(
                buildTS(
                    v[0],
                    cap(k) + "Item",
                    depth + 1,
                    seen
                )
            );
        }
    }

    out += "}";

    return (
        nested
            .filter(Boolean)
            .join("\n") +
        (nested.length
            ? "\n"
            : "") +
        out
    );
}

function tsType(
    v,
    name,
    depth,
    seen
) {
    if (v === null) return "null";

    if (typeof v === "string") {
        return "string";
    }

    if (typeof v === "number") {
        return "number";
    }

    if (typeof v === "boolean") {
        return "boolean";
    }

    if (Array.isArray(v)) {
        if (!v.length) {
            return "unknown[]";
        }

        return `${tsType(
            v[0],
            name + "Item",
            depth,
            seen
        )}[]`;
    }

    if (typeof v === "object") {
        return name;
    }

    return "any";
}

function cap(s) {
    return (
        s.charAt(0).toUpperCase() +
        s.slice(1)
    );
}

function renderJSONTree(data) {
    const el =
        document.getElementById(
            "jsonTree"
        );

    if (!el) return;

    el.className = "jtree";
    el.innerHTML = "";

    el.appendChild(
        buildNode(data)
    );
}

function buildNode(v, key) {
    const wrap =
        document.createElement(
            "div"
        );

    const keyHtml =
        key !== undefined
            ? `<span class="key">"${escapeHTML(
                  String(key)
              )}"</span>: `
            : "";

    if (v === null) {
        wrap.innerHTML =
            `${keyHtml}<span class="null">null</span>`;

        return wrap;
    }

    if (typeof v === "string") {
        wrap.innerHTML =
            `${keyHtml}<span class="str">"${escapeHTML(
                v
            )}"</span>`;

        return wrap;
    }

    if (typeof v === "number") {
        wrap.innerHTML =
            `${keyHtml}<span class="num">${v}</span>`;

        return wrap;
    }

    if (typeof v === "boolean") {
        wrap.innerHTML =
            `${keyHtml}<span class="bool">${v}</span>`;

        return wrap;
    }

    if (
        Array.isArray(v) ||
        typeof v === "object"
    ) {
        const isArr =
            Array.isArray(v);

        const keys =
            Object.keys(v);

        const preview = isArr
            ? `[${keys.length}]`
            : `{${keys.length}}`;

        const toggle =
            document.createElement(
                "span"
            );

        toggle.className =
            "toggle";

        toggle.textContent =
            "▼ ";

        const label =
            document.createElement(
                "span"
            );

        label.innerHTML =
            `${keyHtml}<span style="color:rgba(255,255,255,.4)">${preview}</span>`;

        const header =
            document.createElement(
                "div"
            );

        header.appendChild(toggle);
        header.appendChild(label);

        const nested =
            document.createElement(
                "div"
            );

        nested.className =
            "nested";

        keys.forEach((k) => {
            nested.appendChild(
                buildNode(
                    v[k],
                    isArr
                        ? undefined
                        : k
                )
            );
        });

        toggle.addEventListener(
            "click",
            () => {
                const collapsed =
                    nested.classList.toggle(
                        "collapsed"
                    );

                toggle.textContent =
                    collapsed
                        ? "▶ "
                        : "▼ ";
            }
        );

        wrap.appendChild(header);
        wrap.appendChild(nested);

        return wrap;
    }

    return wrap;
}

/* =========================================================
   DEV TOOLKIT
   ========================================================= */

function uuidv4() {
    return (
        [1e7] +
        -1e3 +
        -4e3 +
        -8e3 +
        -1e11
    ).replace(
        /[018]/g,
        (c) =>
            (
                c ^
                (crypto.getRandomValues(
                    new Uint8Array(1)
                )[0] &
                    (15 >>
                        (c / 4)))
            ).toString(16)
    );
}

function genUUID() {
    const out =
        document.getElementById(
            "uuidOut"
        );

    if (out) {
        out.textContent =
            uuidv4();
    }
}

function genUUIDBulk() {
    const out =
        document.getElementById(
            "uuidOut"
        );

    if (out) {
        out.textContent =
            Array.from(
                { length: 10 },
                () => uuidv4()
            ).join("\n");
    }
}

if (
    document.getElementById(
        "uuidOut"
    )
) {
    genUUID();
}

function genPass() {
    const lenEl =
        document.getElementById(
            "passLen"
        );

    if (!lenEl) return;

    const len =
        parseInt(
            lenEl.value,
            10
        );

    const sym =
        document.getElementById(
            "passSymbols"
        )?.checked;

    const num =
        document.getElementById(
            "passNumbers"
        )?.checked;

    const upp =
        document.getElementById(
            "passUpper"
        )?.checked;

    let chars =
        "abcdefghijklmnopqrstuvwxyz";

    if (upp) {
        chars +=
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    if (num) {
        chars +=
            "0123456789";
    }

    if (sym) {
        chars +=
            "!@#$%^&*()_+-=[]{}|;:,.<>?";
    }

    const arr =
        new Uint32Array(len);

    crypto.getRandomValues(arr);

    const result =
        Array.from(
            arr,
            (n) =>
                chars[
                    n % chars.length
                ]
        ).join("");

    const out =
        document.getElementById(
            "passOut"
        );

    if (out) {
        out.textContent =
            result;
    }
}

if (
    document.getElementById(
        "passOut"
    )
) {
    genPass();
}

/* =========================================================
   BASE64
   ========================================================= */

function b64Encode() {
    const input =
        document.getElementById(
            "b64Input"
        );

    const output =
        document.getElementById(
            "b64Out"
        );

    if (!input || !output) return;

    try {
        output.textContent =
            btoa(
                unescape(
                    encodeURIComponent(
                        input.value
                    )
                )
            );
    } catch (e) {
        output.textContent =
            "Error: " +
            e.message;
    }
}

function b64Decode() {
    const input =
        document.getElementById(
            "b64Input"
        );

    const output =
        document.getElementById(
            "b64Out"
        );

    if (!input || !output) return;

    try {
        output.textContent =
            decodeURIComponent(
                escape(
                    atob(
                        input.value.trim()
                    )
                )
            );
    } catch (e) {
        output.textContent =
            "Error: invalid Base64";
    }
}

/* =========================================================
   TIMESTAMP CONVERTER
   ========================================================= */

function tsNow() {
    const now =
        Math.floor(
            Date.now() / 1000
        );

    const unix =
        document.getElementById(
            "tsUnix"
        );

    if (unix) {
        unix.value = now;
    }

    tsFromUnix();
}

function tsFromUnix() {
    const unix =
        document.getElementById(
            "tsUnix"
        );

    const human =
        document.getElementById(
            "tsHuman"
        );

    if (!unix || !human) {
        return;
    }

    const v =
        parseInt(
            unix.value,
            10
        );

    if (isNaN(v)) {
        human.innerHTML = "";
        return;
    }

    const d =
        new Date(v * 1000);

    human.innerHTML = `
        <span style="color:#fff">
            ${d.toUTCString()}
        </span>
        <br>
        Local:
        ${d.toLocaleString()}
        <br>
        ISO:
        ${d.toISOString()}
        <br>
        Relative:
        ${relTime(d)}
    `;
}

function tsFromDate() {
    const date =
        document.getElementById(
            "tsDate"
        );

    const output =
        document.getElementById(
            "tsUnixOut"
        );

    if (!date || !output) {
        return;
    }

    const v = date.value;

    if (!v) {
        output.textContent = "";
        return;
    }

    const ts =
        Math.floor(
            new Date(v).getTime() /
                1000
        );

    output.textContent =
        isNaN(ts)
            ? "Invalid date"
            : ts;
}

function relTime(d) {
    const diff =
        (Date.now() - d) /
        1000;

    if (
        Math.abs(diff) <
        60
    ) {
        return "Just now";
    }

    if (
        Math.abs(diff) <
        3600
    ) {
        return `${Math.round(
            diff / 60
        )} min ${
            diff > 0
                ? "ago"
                : "from now"
        }`;
    }

    if (
        Math.abs(diff) <
        86400
    ) {
        return `${Math.round(
            diff / 3600
        )} hr ${
            diff > 0
                ? "ago"
                : "from now"
        }`;
    }

    return `${Math.round(
        diff / 86400
    )} days ${
        diff > 0
            ? "ago"
            : "from now"
    }`;
}

if (
    document.getElementById(
        "tsUnix"
    )
) {
    tsNow();
}

/* =========================================================
   COPY HELPER
   ========================================================= */

function copyEl(id) {
    const el =
        document.getElementById(id);

    if (!el) return;

    const value =
        el.innerText ||
        el.textContent ||
        el.value ||
        "";

    navigator.clipboard
        .writeText(value)
        .then(() => showToast())
        .catch(() => {});
}

/* =========================================================
   TEXT DIFF
   ========================================================= */

function runDiff() {
    const aEl =
        document.getElementById(
            "diffA"
        );

    const bEl =
        document.getElementById(
            "diffB"
        );

    const out =
        document.getElementById(
            "diffOut"
        );

    const stats =
        document.getElementById(
            "diffStats"
        );

    if (!aEl || !bEl || !out) {
        return;
    }

    const a =
        aEl.value.split("\n");

    const b =
        bEl.value.split("\n");

    const result =
        lcs(a, b);

    let html = "";
    let added = 0;
    let removed = 0;

    result.forEach((r) => {
        const safe =
            escapeHTML(r.line);

        if (r.type === "add") {
            html += `
                <span class="diff-line diff-add">
                    + ${safe}
                </span>
            `;

            added++;
        } else if (
            r.type === "rem"
        ) {
            html += `
                <span class="diff-line diff-rem">
                    - ${safe}
                </span>
            `;

            removed++;
        } else {
            html += `
                <span class="diff-line diff-eq">
                    &nbsp;&nbsp;${safe}
                </span>
            `;
        }
    });

    out.innerHTML =
        html ||
        "No differences found.";

    if (stats) {
        stats.innerHTML = `
            <span style="color:#4ade80">
                +${added} added
            </span>
            &nbsp;
            <span style="color:#f87171">
                −${removed} removed
            </span>
            &nbsp;
            <span style="color:rgba(255,255,255,.35)">
                ${a.length} / ${b.length} lines
            </span>
        `;
    }
}

function lcs(a, b) {
    const m = a.length;
    const n = b.length;

    const dp =
        Array.from(
            { length: m + 1 },
            () =>
                new Array(
                    n + 1
                ).fill(0)
        );

    for (
        let i = 1;
        i <= m;
        i++
    ) {
        for (
            let j = 1;
            j <= n;
            j++
        ) {
            if (
                a[i - 1] ===
                b[j - 1]
            ) {
                dp[i][j] =
                    dp[i - 1][
                        j - 1
                    ] + 1;
            } else {
                dp[i][j] =
                    Math.max(
                        dp[i - 1][j],
                        dp[i][j - 1]
                    );
            }
        }
    }

    const diff = [];

    let i = m;
    let j = n;

    while (
        i > 0 ||
        j > 0
    ) {
        if (
            i > 0 &&
            j > 0 &&
            a[i - 1] ===
                b[j - 1]
        ) {
            diff.unshift({
                type: "eq",
                line: a[i - 1]
            });

            i--;
            j--;
        } else if (
            j > 0 &&
            (
                i === 0 ||
                dp[i][j - 1] >=
                    dp[i - 1][j]
            )
        ) {
            diff.unshift({
                type: "add",
                line: b[j - 1]
            });

            j--;
        } else {
            diff.unshift({
                type: "rem",
                line: a[i - 1]
            });

            i--;
        }
    }

    return diff;
}

function copyDiff() {
    const out =
        document.getElementById(
            "diffOut"
        );

    if (!out) return;

    navigator.clipboard
        .writeText(
            out.innerText
        )
        .then(() =>
            showToast(
                "Diff copied!"
            )
        )
        .catch(() => {});
}

/* =========================================================
   API TESTER
   ========================================================= */

let lastAPIData = {
    url: "",
    method: "",
    headers: {},
    body: "",
    response: ""
};

async function sendAPI() {
    const url =
        document.getElementById(
            "apiUrl"
        )?.value.trim();

    const method =
        document.getElementById(
            "apiMethod"
        )?.value;

    const rawHeaders =
        document.getElementById(
            "apiHeaders"
        )?.value.trim() || "";

    const body =
        document.getElementById(
            "apiBody"
        )?.value.trim() || "";

    const status =
        document.getElementById(
            "apiStatus"
        );

    const out =
        document.getElementById(
            "apiOut"
        );

    const btn =
        document.getElementById(
            "apiSendBtn"
        );

    if (!url) {
        if (status) {
            status.innerHTML =
                "Enter a URL first.";
        }

        return;
    }

    if (btn) {
        btn.textContent =
            "Sending…";

        btn.disabled = true;
    }

    if (status) {
        status.innerHTML = "";
    }

    if (out) {
        out.style.display =
            "none";
    }

    const headers = {};

    rawHeaders
        .split("\n")
        .forEach((line) => {
            const [
                k,
                ...v
            ] = line.split(":");

            if (
                k &&
                v.length
            ) {
                headers[
                    k.trim()
                ] =
                    v.join(":").trim();
            }
        });

    lastAPIData = {
        url,
        method,
        headers,
        body,
        response: ""
    };

    try {
        const opts = {
            method,
            headers
        };

        if (
            body &&
            method !== "GET" &&
            method !== "DELETE"
        ) {
            opts.body = body;
        }

        const t0 =
            performance.now();

        const res =
            await fetch(
                url,
                opts
            );

        const ms =
            Math.round(
                performance.now() -
                    t0
            );

        const text =
            await res.text();

        lastAPIData.response =
            text;

        let display = text;

        try {
            display =
                JSON.stringify(
                    JSON.parse(
                        text
                    ),
                    null,
                    2
                );
        } catch {
            // Not JSON
        }

        const sc =
            res.status;

        const cls =
            sc < 300
                ? "api-2xx"
                : sc < 400
                ? "api-3xx"
                : sc < 500
                ? "api-4xx"
                : "api-5xx";

        if (status) {
            status.innerHTML = `
                <span class="api-badge ${cls}">
                    ${sc} ${escapeHTML(
                        res.statusText
                    )}
                </span>

                <span style="color:rgba(255,255,255,.35);font-size:.78rem">
                    ${ms}ms ·
                    ${(text.length / 1024).toFixed(1)}KB
                </span>
            `;
        }

        if (out) {
            out.innerHTML =
                syntaxHL(display);

            out.style.display =
                "block";
        }
    } catch (e) {
        if (status) {
            status.innerHTML = `
                <span style="color:#f87171">
                    ✗ ${escapeHTML(
                        e.message
                    )}
                </span>
            `;
        }

        if (out) {
            out.innerHTML = `
                <span style="color:rgba(255,255,255,.3)">
                    Check CORS or URL validity.
                </span>
            `;

            out.style.display =
                "block";
        }
    }

    if (btn) {
        btn.textContent =
            "Send";

        btn.disabled = false;
    }
}

function copyApiResponse() {
    navigator.clipboard
        .writeText(
            lastAPIData.response
        )
        .then(() =>
            showToast(
                "Response copied!"
            )
        )
        .catch(() => {});
}

function copyApiCurl() {
    const {
        url,
        method,
        headers,
        body
    } = lastAPIData;

    let cmd =
        `curl -X ${method}`;

    for (const k in headers) {
        cmd +=
            ` \\\n  -H "${k}: ${headers[k]}"`;
    }

    if (
        body &&
        method !== "GET"
    ) {
        cmd +=
            ` \\\n  -d '${body}'`;
    }

    cmd +=
        ` \\\n  "${url}"`;

    navigator.clipboard
        .writeText(cmd)
        .then(() =>
            showToast(
                "cURL copied!"
            )
        )
        .catch(() => {});
}

/* =========================================================
   RESPONSIVE TOOL LAYOUT
   ========================================================= */

(function () {
    const apply = () => {
        const mobile =
            window.innerWidth <=
            600;

        document
            .querySelectorAll(
                ".diff-cols, .api-cols"
            )
            .forEach((el) => {
                el.style.gridTemplateColumns =
                    mobile
                        ? "1fr"
                        : "1fr 1fr";
            });
    };

    apply();

    window.addEventListener(
        "resize",
        apply
    );
})();

/* =========================================================
   MUSIC PLAYER
   ========================================================= */

const tracks = [
    {
        n: "Regretful - Leverfall (Slowed & Extended)",
        s: "/Regretful - Leverfall (Slowed & Extended).mp3"
    },
    {
        n: "Swing Lynn ( Slowed to Perfection )",
        s: "/Swing Lynn ( Slowed to Perfection ).mp3"
    },
    {
        n: "wifiskeleton - Nope your too late i already died",
        s: "/wifiskeleton - Nope your too late i already died (Official Instrumental).mp3"
    }
];

let idx = 1;
let playing = false;

const aud =
    new Audio(
        tracks[idx].s
    );

aud.volume = 0.45;

const pStatus =
    document.getElementById(
        "p-status"
    );

const pTitle =
    document.getElementById(
        "p-title"
    );

const pBars =
    document.getElementById(
        "p-bars"
    );

const seekbar =
    document.getElementById(
        "seekbar"
    );

const tCur =
    document.getElementById(
        "t-cur"
    );

const tDur =
    document.getElementById(
        "t-dur"
    );

const volbar =
    document.getElementById(
        "volbar"
    );

const icoPlay =
    document.getElementById(
        "ico-play"
    );

const icoPause =
    document.getElementById(
        "ico-pause"
    );

function fmt(s) {
    if (!isFinite(s)) {
        return "0:00";
    }

    return `${Math.floor(
        s / 60
    )}:${Math.floor(
        s % 60
    )
        .toString()
        .padStart(2, "0")}`;
}

function setPlaying(v) {
    playing = v;

    if (pStatus) {
        pStatus.textContent =
            v
                ? "Now Playing"
                : "Stopped";
    }

    if (pBars) {
        pBars.className =
            "bars " +
            (v
                ? "playing"
                : "paused");
    }

    if (icoPlay) {
        icoPlay.style.display =
            v
                ? "none"
                : "";
    }

    if (icoPause) {
        icoPause.style.display =
            v
                ? ""
                : "none";
    }
}

function setTrack(i) {
    idx = i;

    aud.src =
        tracks[i].s;

    aud.load();

    if (pTitle) {
        pTitle.textContent =
            tracks[i].n;
    }

    if (seekbar) {
        seekbar.value = 0;

        seekbar.style.setProperty(
            "--p",
            "0%"
        );
    }

    if (tCur) {
        tCur.textContent =
            "0:00";
    }

    if (tDur) {
        tDur.textContent =
            "0:00";
    }

    if (playing) {
        aud.play().catch(
            () => {}
        );
    }
}

aud.addEventListener(
    "timeupdate",
    () => {
        const p =
            aud.duration > 0
                ? (aud.currentTime /
                      aud.duration) *
                  100
                : 0;

        if (seekbar) {
            seekbar.value = p;

            seekbar.style.setProperty(
                "--p",
                p + "%"
            );
        }

        if (tCur) {
            tCur.textContent =
                fmt(
                    aud.currentTime
                );
        }
    }
);

aud.addEventListener(
    "loadedmetadata",
    () => {
        if (tDur) {
            tDur.textContent =
                fmt(
                    aud.duration
                );
        }
    }
);

aud.addEventListener(
    "ended",
    () =>
        setTrack(
            (idx + 1) %
                tracks.length
        )
);

aud.addEventListener(
    "play",
    () => setPlaying(true)
);

aud.addEventListener(
    "pause",
    () => setPlaying(false)
);

const btnPlay =
    document.getElementById(
        "btn-play"
    );

if (btnPlay) {
    btnPlay.addEventListener(
        "click",
        () => {
            if (aud.paused) {
                aud.play().catch(
                    () => {}
                );
            } else {
                aud.pause();
            }
        }
    );
}

const btnNext =
    document.getElementById(
        "btn-next"
    );

if (btnNext) {
    btnNext.addEventListener(
        "click",
        () =>
            setTrack(
                (idx + 1) %
                    tracks.length
            )
    );
}

const btnPrev =
    document.getElementById(
        "btn-prev"
    );

if (btnPrev) {
    btnPrev.addEventListener(
        "click",
        () => {
            if (
                aud.currentTime >
                2.5
            ) {
                aud.currentTime =
                    0;
            } else {
                setTrack(
                    (idx -
                        1 +
                        tracks.length) %
                        tracks.length
                );
            }
        }
    );
}

if (seekbar) {
    seekbar.addEventListener(
        "input",
        () => {
            const v =
                Number(
                    seekbar.value
                );

            if (
                aud.duration >
                0
            ) {
                aud.currentTime =
                    (v / 100) *
                    aud.duration;
            }

            seekbar.style.setProperty(
                "--p",
                v + "%"
            );
        }
    );
}

if (volbar) {
    volbar.addEventListener(
        "input",
        () => {
            const v =
                Number(
                    volbar.value
                );

            aud.volume = v;

            volbar.style.setProperty(
                "--p",
                v * 100 + "%"
            );
        }
    );
}

/* =========================================================
   UTILITY
   ========================================================= */

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   PROJECT SHOWCASE
   ========================================================= */

const projectData = {
    studentos: {
        title: "StudentOS",
        description:
            "A pocket-sized offline learning environment designed around speed, simplicity and keyboard-first interaction. The project is being built as a foundation for a future dedicated student device.",
        status: "Active",
        stack: "Python / PySide6",
        type: "Education",
        features: [
            "Scientific Calculator",
            "Graphing Calculator",
            "Formula Library",
            "Notes",
            "Flashcards",
            "Study Timer",
            "Offline-first"
        ],
        github: "https://github.com/not-ak74/StudentOS"
    }
};


/* MODAL */

const projectModal = document.getElementById("projectModal");
const projectModalClose = document.getElementById("projectModalClose");
const projectModalDone = document.getElementById("projectModalDone");

const modalTitle = document.getElementById("modalProjectTitle");
const modalDescription = document.getElementById("modalProjectDescription");
const modalStatus = document.getElementById("modalProjectStatus");
const modalStack = document.getElementById("modalProjectStack");
const modalType = document.getElementById("modalProjectType");
const modalFeatures = document.getElementById("modalProjectFeatures");
const modalGithub = document.getElementById("modalProjectGithub");


function openProjectModal(projectId) {
    const project = projectData[projectId];

    if (!project) {
        console.warn(`Project "${projectId}" was not found.`);
        return;
    }

    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;
    modalStatus.textContent = project.status;
    modalStack.textContent = project.stack;
    modalType.textContent = project.type;

    modalFeatures.innerHTML = "";

    project.features.forEach(feature => {
        const tag = document.createElement("span");
        tag.textContent = feature;
        modalFeatures.appendChild(tag);
    });

    modalGithub.href = project.github;

    projectModal.classList.add("open");
    projectModal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}


function closeProjectModal() {
    projectModal.classList.remove("open");
    projectModal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
}


/* Open buttons */

document.querySelectorAll(".project-details-btn").forEach(button => {
    button.addEventListener("click", () => {
        openProjectModal(button.dataset.project);
    });
});


/* Close buttons */

projectModalClose?.addEventListener("click", closeProjectModal);
projectModalDone?.addEventListener("click", closeProjectModal);


/* Click backdrop */

projectModal?.addEventListener("click", event => {
    if (event.target.classList.contains("project-modal-backdrop")) {
        closeProjectModal();
    }
});


/* Escape key */

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && projectModal.classList.contains("open")) {
        closeProjectModal();
    }
});


/* =========================================================
   PROJECT CARD MICRO-INTERACTION
   ========================================================= */

document.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("mousemove", event => {
        if (window.innerWidth <= 768) return;

        const rect = card.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const rotateX =
            ((y / rect.height) - 0.5) * -2;

        const rotateY =
            ((x / rect.width) - 0.5) * 2;

        card.style.transform =
            `translateY(-6px) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "";
    });
});


/* =========================================================
   OPTIONAL PROJECT REVEAL
   Works with your existing .reveal system too.
   ========================================================= */

function initProjectReveal() {
    const projectElements = document.querySelectorAll(
        ".projects-section .reveal"
    );

    if (!projectElements.length) return;

    if (!("IntersectionObserver" in window)) {
        projectElements.forEach(el => {
            el.classList.add("visible");
        });

        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.1,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    projectElements.forEach(el => observer.observe(el));
}

initProjectReveal();

function openColorTool() {
    const tools = document.getElementById('tools');
    const colorTab = document.getElementById('colorToolTab');

    colorTab.click();

    tools.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}