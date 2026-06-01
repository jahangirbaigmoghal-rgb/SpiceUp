    (typeof t == "string" ? ((n = n || {}), (n.url = t)) : (n = t || {}),
      (n = er(this.defaults, n)));
    const { transitional: r, paramsSerializer: s, headers: l } = n;
    (r !== void 0 &&
      ql.assertOptions(
        r,
        {
          silentJSONParsing: ot.transitional(ot.boolean),
          forcedJSONParsing: ot.transitional(ot.boolean),
          clarifyTimeoutError: ot.transitional(ot.boolean),
          legacyInterceptorReqResOrdering: ot.transitional(ot.boolean),
        },
        !1,
      ),
      s != null &&
        (b.isFunction(s)
          ? (n.paramsSerializer = { serialize: s })
          : ql.assertOptions(
              s,
              { encode: ot.function, serialize: ot.function },
              !0,
            )),
      n.allowAbsoluteUrls !== void 0 ||
        (this.defaults.allowAbsoluteUrls !== void 0
          ? (n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls)
          : (n.allowAbsoluteUrls = !0)),
      ql.assertOptions(
        n,
        {
          baseUrl: ot.spelling("baseURL"),
          withXsrfToken: ot.spelling("withXSRFToken"),
        },
        !0,
      ),
      (n.method = (n.method || this.defaults.method || "get").toLowerCase()));
    let o = l && b.merge(l.common, l[n.method]);
    (l &&
      b.forEach(
        ["delete", "get", "head", "post", "put", "patch", "query", "common"],
        (j) => {
          delete l[j];
        },
      ),
      (n.headers = Ve.concat(o, l)));
    const i = [];
    let c = !0;
    this.interceptors.request.forEach(function (w) {
      if (typeof w.runWhen == "function" && w.runWhen(n) === !1) return;
      c = c && w.synchronous;
      const N = n.transitional || Mu;
      N && N.legacyInterceptorReqResOrdering
        ? i.unshift(w.fulfilled, w.rejected)
        : i.push(w.fulfilled, w.rejected);
    });
    const d = [];
    this.interceptors.response.forEach(function (w) {
      d.push(w.fulfilled, w.rejected);
    });
    let h,
      y = 0,
      g;
    if (!c) {
      const j = [Dd.bind(this), void 0];
      for (
        j.unshift(...i), j.push(...d), g = j.length, h = Promise.resolve(n);
        y < g;
      )
        h = h.then(j[y++], j[y++]);
      return h;
    }
    g = i.length;
    let S = n;
    for (; y < g; ) {
      const j = i[y++],
        w = i[y++];
      try {
        S = j(S);
      } catch (N) {
        w.call(this, N);
        break;
      }
    }
    try {
      h = Dd.call(this, S);
    } catch (j) {
      return Promise.reject(j);
    }
    for (y = 0, g = d.length; y < g; ) h = h.then(d[y++], d[y++]);
    return h;
  }
  getUri(t) {
    t = er(this.defaults, t);
    const n = zh(t.baseURL, t.url, t.allowAbsoluteUrls);
    return Lh(n, t.params, t.paramsSerializer);
  }
};
b.forEach(["delete", "get", "head", "options"], function (t) {
  Kn.prototype[t] = function (n, r) {
    return this.request(
      er(r || {}, { method: t, url: n, data: (r || {}).data }),
    );
  };
});
b.forEach(["post", "put", "patch", "query"], function (t) {
  function n(r) {
    return function (l, o, i) {
      return this.request(
        er(i || {}, {
          method: t,
          headers: r ? { "Content-Type": "multipart/form-data" } : {},
          url: l,
          data: o,
        }),
      );
    };
  }
  ((Kn.prototype[t] = n()),
    t !== "query" && (Kn.prototype[t + "Form"] = n(!0)));
});
let Qv = class $h {
  constructor(t) {
    if (typeof t != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function (l) {
      n = l;
    });
    const r = this;
    (this.promise.then((s) => {
      if (!r._listeners) return;
      let l = r._listeners.length;
      for (; l-- > 0; ) r._listeners[l](s);
      r._listeners = null;
    }),
      (this.promise.then = (s) => {
        let l;
        const o = new Promise((i) => {
          (r.subscribe(i), (l = i));
        }).then(s);
        return (
          (o.cancel = function () {
            r.unsubscribe(l);
          }),
          o
        );
      }),
      t(function (l, o, i) {
        r.reason || ((r.reason = new tl(l, o, i)), n(r.reason));
      }));
  }
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  subscribe(t) {
    if (this.reason) {
      t(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(t) : (this._listeners = [t]);
  }
  unsubscribe(t) {
    if (!this._listeners) return;
    const n = this._listeners.indexOf(t);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const t = new AbortController(),
      n = (r) => {
        t.abort(r);
      };
    return (
      this.subscribe(n),
      (t.signal.unsubscribe = () => this.unsubscribe(n)),
      t.signal
    );
  }
  static source() {
    let t;
    return {
      token: new $h(function (s) {
        t = s;
      }),
      cancel: t,
    };
  }
};
function qv(e) {
  return function (n) {
    return e.apply(null, n);
  };
}
function Wv(e) {
  return b.isObject(e) && e.isAxiosError === !0;
}
const Mi = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};
Object.entries(Mi).forEach(([e, t]) => {
  Mi[t] = e;
});
function Hh(e) {
  const t = new Kn(e),
    n = Nh(Kn.prototype.request, t);
  return (
    b.extend(n, Kn.prototype, t, { allOwnKeys: !0 }),
    b.extend(n, t, null, { allOwnKeys: !0 }),
    (n.create = function (s) {
      return Hh(er(e, s));
    }),
    n
  );
}
const he = Hh(el);
he.Axios = Kn;
he.CanceledError = tl;
he.CancelToken = Qv;
he.isCancel = Fh;
he.VERSION = Du;
he.toFormData = Ba;
he.AxiosError = F;
he.Cancel = he.CanceledError;
he.all = function (t) {
  return Promise.all(t);
};
he.spread = qv;
he.isAxiosError = Wv;
he.mergeConfig = er;
he.AxiosHeaders = Ve;
he.formToJSON = (e) => Mh(b.isHTMLForm(e) ? new FormData(e) : e);
he.getAdapter = Bh.getAdapter;
he.HttpStatusCode = Mi;
he.default = he;
const {
    Axios: r1,
    AxiosError: s1,
    CanceledError: l1,
    isCancel: a1,
    CancelToken: o1,
    VERSION: i1,
    all: u1,
    Cancel: c1,
    isAxiosError: d1,
    spread: f1,
    toFormData: p1,
    AxiosHeaders: h1,
    HttpStatusCode: m1,
    formToJSON: x1,
    getAdapter: y1,
    mergeConfig: g1,
    create: v1,
  } = he,
  Ro = {},
  Kv = (Ro == null ? void 0 : Ro.VITE_API_URL) ?? "http://localhost:5001";
function Gv() {
  const e = he.create({
    baseURL: `${Kv}/api`,
    withCredentials: !0,
    headers: { "Content-Type": "application/json" },
    timeout: 15e3,
  });
  return (
    e.interceptors.request.use(
      (t) => (
        (t.method === "post" || t.method === "put") &&
          (t.headers["X-Idempotency-Key"] ||
            (t.headers["X-Idempotency-Key"] =
              `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)),
        t
      ),
    ),
    e.interceptors.response.use(
      (t) => t,
      async (t) => {
        var n;
        return (
          ((n = t.response) == null ? void 0 : n.status) === 401 &&
            typeof window < "u" &&
            window.dispatchEvent(new CustomEvent("auth:unauthorized")),
          Promise.reject(t)
        );
      },
    ),
    e
  );
}
const D = Gv(),
  Oo = {
    login: (e) => D.post("/auth/login", e),
    loginPin: (e) => D.post("/auth/login-pin", e),
    logout: () => D.post("/auth/logout"),
    me: () => D.get("/auth/me"),
    openShift: (e) => D.post("/auth/shift/open", e),
    closeShift: (e) => D.post("/auth/shift/close", e),
    currentShift: () => D.get("/auth/shift/current"),
  },
  Q = {
    categories: (e) => D.get("/menu/categories", { params: e }),
    items: (e) => D.get("/menu/items", { params: e }),
    item: (e) => D.get(`/menu/items/${e}`),
    createItem: (e) => D.post("/menu/items", e),
    updateItem: (e, t) => D.put(`/menu/items/${e}`, t),
    deleteItem: (e) => D.delete(`/menu/items/${e}`),
    toggleAvailability: (e, t) =>
      D.patch(`/menu/items/${e}/availability`, { isAvailable: t }),
    createCategory: (e) => D.post("/menu/categories", e),
    updateCategory: (e, t) => D.put(`/menu/categories/${e}`, t),
    deleteCategory: (e) => D.delete(`/menu/categories/${e}`),
    modifierGroups: () => D.get("/menu/modifiers"),
    createModifierGroup: (e) => D.post("/menu/modifiers", e),
    updateModifierGroup: (e, t) => D.put(`/menu/modifiers/${e}`, t),
    deleteModifierGroup: (e) => D.delete(`/menu/modifiers/${e}`),
    components: () => D.get("/menu/components"),
    createComponent: (e) => D.post("/menu/components", e),
    updateComponent: (e, t) => D.put(`/menu/components/${e}`, t),
    deleteComponent: (e) => D.delete(`/menu/components/${e}`),
    labels: () => D.get("/menu/labels"),
    createLabel: (e) => D.post("/menu/labels", e),
    updateLabel: (e, t) => D.put(`/menu/labels/${e}`, t),
    deleteLabel: (e) => D.delete(`/menu/labels/${e}`),
    departments: () => D.get("/menu/departments"),
    createDepartment: (e) => D.post("/menu/departments", e),
    updateDepartment: (e, t) => D.put(`/menu/departments/${e}`, t),
    deleteDepartment: (e) => D.delete(`/menu/departments/${e}`),
    manualProducts: () => D.get("/menu/manual-products"),
    createManualProduct: (e) => D.post("/menu/manual-products", e),
    updateManualProduct: (e, t) => D.put(`/menu/manual-products/${e}`, t),
    deleteManualProduct: (e) => D.delete(`/menu/manual-products/${e}`),
    shorthands: () => D.get("/menu/shorthands"),
    createShortHand: (e) => D.post("/menu/shorthands", e),
    updateShortHand: (e, t) => D.put(`/menu/shorthands/${e}`, t),
    deleteShortHand: (e) => D.delete(`/menu/shorthands/${e}`),
    productTimes: () => D.get("/menu/product-times"),
    createProductTime: (e) => D.post("/menu/product-times", e),
    updateProductTime: (e, t) => D.put(`/menu/product-times/${e}`, t),
    deleteProductTime: (e) => D.delete(`/menu/product-times/${e}`),
    variations: (e) => D.get("/menu/variations", { params: e }),
    createVariation: (e) => D.post("/menu/variations", e),
    updateVariation: (e, t) => D.put(`/menu/variations/${e}`, t),
    deleteVariation: (e) => D.delete(`/menu/variations/${e}`),
    bundles: (e) => D.get("/menu/bundles", { params: e }),
    createBundle: (e) => D.post("/menu/bundles", e),
    updateBundle: (e, t) => D.put(`/menu/bundles/${e}`, t),
    deleteBundle: (e) => D.delete(`/menu/bundles/${e}`),
  },
  Xv = {
    dashboard: () => D.get("/reports/dashboard"),
    sales: (e) => D.get("/reports/sales", { params: e }),
    zReport: (e) => D.get("/reports/zreport", { params: { date: e } }),
    vatReport: (e) => D.get("/reports/vat", { params: e }),
    voiceAgent: (e) => D.get("/reports/voice-agent", { params: e }),
  },
  cs = [
    { bg: "#b91c1c", text: "#ffffff", label: "Red" },
    { bg: "#f59e0b", text: "#ffffff", label: "Amber" },
    { bg: "#10b981", text: "#ffffff", label: "Emerald" },
    { bg: "#3b82f6", text: "#ffffff", label: "Blue" },
    { bg: "#8b5cf6", text: "#ffffff", label: "Violet" },
    { bg: "#ec4899", text: "#ffffff", label: "Pink" },
    { bg: "#1e293b", text: "#f8fafc", label: "Slate" },
  ];
function Yv() {
  const [e, t] = L.useState(!1),
    [n, r] = L.useState(""),
    [s, l] = L.useState(""),
    [o, i] = L.useState("dashboard"),
    [c, d] = L.useState(""),
    [h, y] = L.useState(""),
    [g, S] = L.useState({
      todaySales: 124050,
      orderCount: 42,
      avgTicket: 2953,
      activeVoiceCalls: 3,
    }),
    [j, w] = L.useState([]),
    [N, f] = L.useState([]),
    [p, m] = L.useState([]),
    [v, E] = L.useState([]),
    [_, T] = L.useState([]),
    [R, V] = L.useState([]),
    [U, le] = L.useState([]),
    [Ze, Ct] = L.useState([]),
    [Te, _n] = L.useState([]),
    [ye, It] = L.useState(null),
    [A, I] = L.useState(!1),
    [z, X] = L.useState(null),
    [K, J] = L.useState({
      name: "",
      displayOrder: 1,
      parent: "",
      department: "",
      backgroundColor: "#b91c1c",
      textColor: "#ffffff",
    }),
    [Ne, ge] = L.useState(!1),
    [Ie, Ce] = L.useState(null),
    [B, ve] = L.useState({
      name: "",
      menuCode: "",
      description: "",
      pricePounds: "0.00",
      vatRate: 20,
      category: "",
      isAvailable: !0,
      backgroundColor: "#1e293b",
      textColor: "#ffffff",
      printOption: "both",
      imageUrl: "",
      selectedModifiers: [],
    }),
    [rr, Ut] = L.useState(!1),
    [sr, nl] = L.useState(null),
    [Y, Ee] = L.useState({
      name: "",
      displayName: "",
      dashboardHeading: "",
      staticLabelsEnabled: !0,
      samePrice: !1,
      samePricePounds: "0.00",
      type: "optional",
      selectionType: "single",
      minSelections: 0,
      maxSelections: 1,
      options: [],
      isActive: !0,
    }),
    [Vh, rl] = L.useState(!1),
    [Ha, Iu] = L.useState(null),
    [mt, Rn] = L.useState({
      name: "",
      description: "",
      color: "#1e293b",
      textColor: "#f8fafc",
      defaultPricePounds: "0.00",
      isActive: !0,
    }),
    [Qh, sl] = L.useState(!1),
    [Va, Uu] = L.useState(null),
    [Xr, Yr] = L.useState({
      name: "",
      backgroundColor: "#334155",
      textColor: "#f8fafc",
      isActive: !0,
    }),
    [qh, ll] = L.useState(!1),
    [Qa, Bu] = L.useState(null),
    [Ue, Bt] = L.useState({
      name: "",
      code: "",
      pricePounds: "0.00",
      category: "",
      description: "",
      color: "#3b82f6",
      printOption: "both",
      isActive: !0,
    }),
    [Wh, al] = L.useState(!1),
    [qa, $u] = L.useState(null),
    [On, Tn] = L.useState({
      menuItem: "",
      shorthandCode: "",
      printOnReceipt: !1,
      printOnTicket: !0,
      isActive: !0,
    }),
    [Kh, ol] = L.useState(!1),
    [Wa, Hu] = L.useState(null),
    [il, ul] = L.useState({ name: "", isActive: !0 }),
    [Gh, cl] = L.useState(!1),
    [Ka, Vu] = L.useState(null),
    [lr, ar] = L.useState({
      name: "",
      startTime: "12:00",
      endTime: "22:00",
      isActive: !0,
    });
  L.useEffect(() => {
    (async () => {
      try {
        const x = await Oo.me();
        x.data && x.data.user && (t(!0), me());
      } catch {}
    })();
  }, []);
  const me = async () => {
      try {
        const u = await Q.categories();
        w(u.data.categories || []);
        const x = await Q.items();
        f(x.data.items || []);
        const C = await Q.modifierGroups();
        m(C.data.modifiers || C.data.modifierGroups || []);
        const O = await Q.components();
        E(O.data.components || []);
        const H = await Q.labels();
        T(H.data.labels || []);
        const fe = await Q.departments();
        V(fe.data.departments || []);
        const Xa = await Q.manualProducts();
        le(Xa.data.manualProducts || []);
        const or = await Q.shorthands();
        Ct(or.data.shorthands || []);
        const Jr = await Q.productTimes();
        _n(Jr.data.productTimes || []);
        const Ya = await Xv.dashboard();
        Ya.data && Ya.data.stats && S(Ya.data.stats);
      } catch (u) {
        console.error("Failed to load admin data", u);
      }
    },
    Xh = async (u) => {
      var x, C;
      (u.preventDefault(), d(""));
      try {
        (await Oo.login({ username: n, password: s }),
          t(!0),
          me(),
          r(""),
          l(""));
      } catch (O) {
        d(
          ((C = (x = O.response) == null ? void 0 : x.data) == null
            ? void 0
            : C.message) || "Invalid credentials",
        );
      }
    },
    Yh = async () => {
      try {
        (await Oo.logout(), t(!1));
      } catch {
        t(!1);
      }
    },
    ee = (u) => {
      (y(u), setTimeout(() => y(""), 3e3));
    },
    Jh = async (u, x) => {
      try {
        (await Q.toggleAvailability(u, !x),
          f((C) => C.map((O) => (O._id === u ? { ...O, isAvailable: !x } : O))),
          ee("Item availability updated."));
      } catch {
        d("Failed to update availability.");
      }
    },
    Ga = (u) => {
      var x, C;
      (u
        ? (X(u),
          J({
            name: u.name,
            displayOrder: u.displayOrder,
            parent:
              typeof u.parent == "string"
                ? u.parent
                : ((x = u.parent) == null ? void 0 : x._id) || "",
            department:
              typeof u.department == "string"
                ? u.department
                : ((C = u.department) == null ? void 0 : C._id) || "",
            backgroundColor: u.backgroundColor || "#b91c1c",
            textColor: u.textColor || "#ffffff",
          }))
        : (X(null),
          J({
            name: "",
            displayOrder: j.length + 1,
            parent: "",
            department: "",
            backgroundColor: "#b91c1c",
            textColor: "#ffffff",
          })),
        I(!0));
    },
    Zh = async (u) => {
      var C, O;
      (u.preventDefault(), d(""));
      const x = {
        name: K.name,
        displayOrder: K.displayOrder,
        parent: K.parent || null,
        department: K.department || null,
        backgroundColor: K.backgroundColor,
        textColor: K.textColor,
      };
      try {
        (z
          ? (await Q.updateCategory(z._id, x), ee("Category updated."))
          : (await Q.createCategory(x), ee("Category created.")),
          I(!1),
          me());
      } catch (H) {
        d(
          ((O = (C = H.response) == null ? void 0 : C.data) == null
            ? void 0
            : O.error) || "Failed to save category",
        );
      }
    },
    Qu = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this category?"))
        try {
          (await Q.deleteCategory(u), ee("Category deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete category",
          );
        }
    },
    qu = (u) => {
      var x, C, O;
      (u
        ? (Ce(u),
          ve({
            name: u.name,
            menuCode: u.menuCode || "",
            description: u.description || "",
            pricePounds: ur(u.pricePence).toFixed(2),
            vatRate: u.vatRate,
            category:
              typeof u.category == "string"
                ? u.category
                : ((x = u.category) == null ? void 0 : x._id) || "",
            isAvailable: u.isAvailable,
            backgroundColor: u.backgroundColor || "#1e293b",
            textColor: u.textColor || "#ffffff",
            printOption: u.printOption || "both",
            imageUrl: ((C = u.images) == null ? void 0 : C[0]) || "",
            selectedModifiers: u.modifierGroups.map((H) =>
              typeof H == "string" ? H : H._id,
            ),
          }))
        : (Ce(null),
          ve({
            name: "",
            menuCode: "",
            description: "",
            pricePounds: "0.00",
            vatRate: 20,
            category: ((O = j[0]) == null ? void 0 : O._id) || "",
            isAvailable: !0,
            backgroundColor: "#1e293b",
            textColor: "#ffffff",
            printOption: "both",
            imageUrl: "",
            selectedModifiers: [],
          })),
        ge(!0));
    },
    e0 = async (u) => {
      var O, H;
      (u.preventDefault(), d(""));
      const x = is(parseFloat(B.pricePounds)),
        C = {
          name: B.name,
          menuCode: B.menuCode,
          description: B.description,
          basePricePence: x,
          vatRate: B.vatRate,
          category: B.category,
          isAvailable: B.isAvailable,
          backgroundColor: B.backgroundColor,
          textColor: B.textColor,
          printOption: B.printOption,
          images: B.imageUrl ? [B.imageUrl] : [],
          modifierGroups: B.selectedModifiers,
        };
      try {
        (Ie
          ? (await Q.updateItem(Ie._id, C), ee("Product updated."))
          : (await Q.createItem(C), ee("Product created.")),
          ge(!1),
          me());
      } catch (fe) {
        d(
          ((H = (O = fe.response) == null ? void 0 : O.data) == null
            ? void 0
            : H.error) || "Failed to save product",
        );
      }
    },
    t0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this product?"))
        try {
          (await Q.deleteItem(u), ee("Product deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete product",
          );
        }
    },
    Wu = (u) => {
      (u
        ? (nl(u),
          Ee({
            name: u.name,
            displayName: u.displayName || "",
            dashboardHeading: u.dashboardHeading || "",
            staticLabelsEnabled: u.staticLabelsEnabled !== !1,
            samePrice: u.samePrice || !1,
            samePricePounds: ur(u.samePricePence || 0).toFixed(2),
            type: u.type || "optional",
            selectionType: u.selectionType || "single",
            minSelections: u.minSelections || 0,
            maxSelections: u.maxSelections || 1,
            options: u.options.map((x) => {
              var C;
              return {
                component:
                  typeof x.component == "string"
                    ? x.component
                    : ((C = x.component) == null ? void 0 : C._id) || "",
                name: x.name,
                pricePounds: ur(x.priceDeltaPence).toFixed(2),
                isDefault: x.isDefault || !1,
              };
            }),
            isActive: u.isActive !== !1,
          }))
        : (nl(null),
          Ee({
            name: "",
            displayName: "",
            dashboardHeading: "",
            staticLabelsEnabled: !0,
            samePrice: !1,
            samePricePounds: "0.00",
            type: "optional",
            selectionType: "single",
            minSelections: 0,
            maxSelections: 1,
            options: [],
            isActive: !0,
          })),
        Ut(!0));
    },
    n0 = async (u) => {
      var O, H;
      (u.preventDefault(), d(""));
      const x = is(parseFloat(Y.samePricePounds)),
        C = {
          name: Y.name,
          displayName: Y.displayName,
          dashboardHeading: Y.dashboardHeading,
          staticLabelsEnabled: Y.staticLabelsEnabled,
          samePrice: Y.samePrice,
          samePricePence: x,
          type: Y.type,
          selectionType: Y.selectionType,
          minSelections: Y.minSelections,
          maxSelections: Y.maxSelections,
          options: Y.options.map((fe) => ({
            component: fe.component || null,
            name: fe.name,
            priceDeltaPence: is(parseFloat(fe.pricePounds)),
            isDefault: fe.isDefault,
          })),
          isActive: Y.isActive,
        };
      try {
        (sr
          ? (await Q.updateModifierGroup(sr._id, C),
            ee("Modifier group updated."))
          : (await Q.createModifierGroup(C), ee("Modifier group created.")),
          Ut(!1),
          me());
      } catch (fe) {
        d(
          ((H = (O = fe.response) == null ? void 0 : O.data) == null
            ? void 0
            : H.error) || "Failed to save modifier group",
        );
      }
    },
    r0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this modifier group?"))
        try {
          (await Q.deleteModifierGroup(u), ee("Modifier group deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete modifier group",
          );
        }
    },
    Ku = (u) => {
      (u
        ? (Iu(u),
          Rn({
            name: u.name,
            description: u.description || "",
            color: u.color || "#1e293b",
            textColor: u.textColor || "#f8fafc",
            defaultPricePounds: ur(u.defaultPriceDeltaPence).toFixed(2),
            isActive: u.isActive !== !1,
          }))
        : (Iu(null),
          Rn({
            name: "",
            description: "",
            color: "#1e293b",
            textColor: "#f8fafc",
            defaultPricePounds: "0.00",
            isActive: !0,
          })),
        rl(!0));
    },
    s0 = async (u) => {
      var O, H;
      (u.preventDefault(), d(""));
      const x = is(parseFloat(mt.defaultPricePounds)),
        C = {
          name: mt.name,
          description: mt.description,
          color: mt.color,
          textColor: mt.textColor,
          defaultPriceDeltaPence: x,
          isActive: mt.isActive,
        };
      try {
        (Ha
          ? (await Q.updateComponent(Ha._id, C), ee("Component updated."))
          : (await Q.createComponent(C), ee("Component created.")),
          rl(!1),
          me());
      } catch (fe) {
        d(
          ((H = (O = fe.response) == null ? void 0 : O.data) == null
            ? void 0
            : H.error) || "Failed to save component",
        );
      }
    },
    l0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this component?"))
        try {
          (await Q.deleteComponent(u), ee("Component deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete component",
          );
        }
    },
    Gu = (u) => {
      (u
        ? (Uu(u),
          Yr({
            name: u.name,
            backgroundColor: u.backgroundColor,
            textColor: u.textColor,
            isActive: u.isActive !== !1,
          }))
        : (Uu(null),
          Yr({
            name: "",
            backgroundColor: "#334155",
            textColor: "#f8fafc",
            isActive: !0,
          })),
        sl(!0));
    },
    a0 = async (u) => {
      var x, C;
      (u.preventDefault(), d(""));
      try {
        (Va
          ? (await Q.updateLabel(Va._id, Xr), ee("Label updated."))
          : (await Q.createLabel(Xr), ee("Label created.")),
          sl(!1),
          me());
      } catch (O) {
        d(
          ((C = (x = O.response) == null ? void 0 : x.data) == null
            ? void 0
            : C.error) || "Failed to save label",
        );
      }
    },
    o0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this label?"))
        try {
          (await Q.deleteLabel(u), ee("Label deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete label",
          );
        }
    },
    Xu = (u) => {
      var x, C;
      (u
        ? (Bu(u),
          Bt({
            name: u.name,
            code: u.code || "",
            pricePounds: ur(u.pricePence).toFixed(2),
            category:
              typeof u.category == "string"
                ? u.category
                : ((x = u.category) == null ? void 0 : x._id) || "",
            description: u.description || "",
            color: u.color || "#3b82f6",
            printOption: u.printOption || "both",
            isActive: u.isActive !== !1,
          }))
        : (Bu(null),
          Bt({
            name: "",
            code: "",
            pricePounds: "0.00",
            category: ((C = j[0]) == null ? void 0 : C._id) || "",
            description: "",
            color: "#3b82f6",
            printOption: "both",
            isActive: !0,
          })),
        ll(!0));
    },
    i0 = async (u) => {
      var O, H;
      (u.preventDefault(), d(""));
      const x = is(parseFloat(Ue.pricePounds)),
        C = {
          name: Ue.name,
          code: Ue.code,
          pricePence: x,
          category: Ue.category || null,
          description: Ue.description,
          color: Ue.color,
          printOption: Ue.printOption,
          isActive: Ue.isActive,
        };
      try {
        (Qa
          ? (await Q.updateManualProduct(Qa._id, C),
            ee("Manual product updated."))
          : (await Q.createManualProduct(C), ee("Manual product created.")),
          ll(!1),
          me());
      } catch (fe) {
        d(
          ((H = (O = fe.response) == null ? void 0 : O.data) == null
            ? void 0
            : H.error) || "Failed to save manual product",
        );
      }
    },
    u0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this manual product?"))
        try {
          (await Q.deleteManualProduct(u), ee("Manual product deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete manual product",
          );
        }
    },
    Yu = (u) => {
      var x, C;
      (u
        ? ($u(u),
          Tn({
            menuItem:
              typeof u.menuItem == "string"
                ? u.menuItem
                : ((x = u.menuItem) == null ? void 0 : x._id) || "",
            shorthandCode: u.shorthandCode,
            printOnReceipt: u.printOnReceipt,
            printOnTicket: u.printOnTicket,
            isActive: u.isActive !== !1,
          }))
        : ($u(null),
          Tn({
            menuItem: ((C = N[0]) == null ? void 0 : C._id) || "",
            shorthandCode: "",
            printOnReceipt: !1,
            printOnTicket: !0,
            isActive: !0,
          })),
        al(!0));
    },
    c0 = async (u) => {
      var x, C;
      (u.preventDefault(), d(""));
      try {
        (qa
          ? (await Q.updateShortHand(qa._id, On), ee("ShortHand updated."))
          : (await Q.createShortHand(On), ee("ShortHand created.")),
          al(!1),
          me());
      } catch (O) {
        d(
          ((C = (x = O.response) == null ? void 0 : x.data) == null
            ? void 0
            : C.error) || "Failed to save shorthand",
        );
      }
    },
    d0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this shorthand?"))
        try {
          (await Q.deleteShortHand(u), ee("ShortHand deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete shorthand",
          );
        }
    },
    Ju = (u) => {
      (u
        ? (Hu(u), ul({ name: u.name, isActive: u.isActive !== !1 }))
        : (Hu(null), ul({ name: "", isActive: !0 })),
        ol(!0));
    },
    f0 = async (u) => {
      var x, C;
      (u.preventDefault(), d(""));
      try {
        (Wa
          ? (await Q.updateDepartment(Wa._id, il), ee("Department updated."))
          : (await Q.createDepartment(il), ee("Department created.")),
          ol(!1),
          me());
      } catch (O) {
        d(
          ((C = (x = O.response) == null ? void 0 : x.data) == null
            ? void 0
            : C.error) || "Failed to save department",
        );
      }
    },
    p0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this department?"))
        try {
          (await Q.deleteDepartment(u), ee("Department deleted."), me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete department",
          );
        }
    },
    Zu = (u) => {
      (u
        ? (Vu(u),
          ar({
            name: u.name,
            startTime: u.startTime,
            endTime: u.endTime,
            isActive: u.isActive !== !1,
          }))
        : (Vu(null),
          ar({ name: "", startTime: "12:00", endTime: "22:00", isActive: !0 })),
        cl(!0));
    },
    h0 = async (u) => {
      var x, C;
      (u.preventDefault(), d(""));
      try {
        (Ka
          ? (await Q.updateProductTime(Ka._id, lr),
            ee("Product shift schedule updated."))
          : (await Q.createProductTime(lr),
            ee("Product shift schedule created.")),
          cl(!1),
          me());
      } catch (O) {
        d(
          ((C = (x = O.response) == null ? void 0 : x.data) == null
            ? void 0
            : C.error) || "Failed to save product time slot",
        );
      }
    },
    m0 = async (u) => {
      var x, C;
      if (confirm("Are you sure you want to delete this shift slot?"))
        try {
          (await Q.deleteProductTime(u),
            ee("Product shift slot deleted."),
            me());
        } catch (O) {
          d(
            ((C = (x = O.response) == null ? void 0 : x.data) == null
              ? void 0
              : C.error) || "Failed to delete product time slot",
          );
        }
    },
    x0 = j.filter((u) => !u.parent),
    ec = ye ? j.find((u) => u._id === ye) : null,
    tc = N.filter((u) => {
      var C;
      const x =
        typeof u.category == "string"
          ? u.category
          : (C = u.category) == null
            ? void 0
            : C._id;
      if (ye) {
        const O = j
          .filter((H) => {
            var fe;
            return typeof H.parent == "string"
              ? H.parent === ye
              : ((fe = H.parent) == null ? void 0 : fe._id) === ye;
          })
          .map((H) => H._id);
        return x === ye || O.includes(x);
      }
      return !0;
    });
  return e
    ? a.jsxs("div", {
        className:
          "h-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans",
        children: [
          a.jsxs("aside", {
            className:
              "w-60 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0",
            children: [
              a.jsxs("div", {
                className:
                  "h-16 flex items-center space-x-2.5 px-5 border-b border-slate-900",
                children: [
                  a.jsx("div", {
                    className:
                      "w-8 h-8 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center",
                    children: a.jsx(Yy, {
                      className: "w-4.5 h-4.5 text-white",
                    }),
                  }),
                  a.jsx("span", {
                    className: "font-extrabold text-sm tracking-wide",
                    children: "Backoffice Pro",
                  }),
                ],
              }),
              a.jsxs("nav", {
                className: "flex-1 p-3 space-y-1 overflow-y-auto",
                children: [
                  a.jsxs("button", {
                    onClick: () => i("dashboard"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "dashboard" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Qy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Dashboard" }),
                    ],
                  }),
                  a.jsx("div", {
                    className:
                      "pt-3 pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500",
                    children: "Menu Configuration",
                  }),
                  a.jsxs("button", {
                    onClick: () => i("products"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "products" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(zy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Products & Categories" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("groups"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "groups" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Jy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Modifier Groups" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("components"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "components" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Vy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Component Database" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("labels"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "labels" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(eg, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Label Instructions" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("manual-products"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "manual-products" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Zy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Manual Product" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("shorthands"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "shorthands" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Hy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Short Hand Codes" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("departments"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "departments" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Xy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Departments" }),
                    ],
                  }),
                  a.jsxs("button", {
                    onClick: () => i("product-times"),
                    className: `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${o === "product-times" ? "bg-brand-500/15 border border-brand-500/40 text-brand-400" : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"}`,
                    children: [
                      a.jsx(Iy, { className: "w-4 h-4" }),
                      a.jsx("span", { children: "Product Time Shift" }),
                    ],
                  }),
                ],
              }),
              a.jsx("div", {
                className: "p-3 border-t border-slate-900",
                children: a.jsxs("button", {
                  onClick: Yh,
                  className:
                    "w-full flex items-center space-x-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer",
                  children: [
                    a.jsx(Wy, { className: "w-3.5 h-3.5" }),
                    a.jsx("span", { children: "Log Out" }),
                  ],
                }),
              }),
            ],
          }),
          a.jsxs("main", {
            className: "flex-1 flex flex-col bg-slate-900/10 overflow-hidden",
            children: [
              a.jsxs("header", {
                className:
                  "h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950/20",
                children: [
                  a.jsxs("h2", {
                    className:
                      "text-sm font-extrabold uppercase tracking-widest text-slate-200",
                    children: [o.replace("-", " "), " MANAGEMENT"],
                  }),
                  (h || c) &&
                    a.jsx("div", {
                      className: `px-4 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 ${h ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-rose-950/30 border-rose-500/30 text-rose-400"}`,
                      children: a.jsx("span", { children: h || c }),
                    }),
                ],
              }),
              a.jsxs("div", {
                className: "flex-1 overflow-y-auto p-6",
                children: [
                  o === "dashboard" &&
                    a.jsxs("div", {
                      className: "space-y-6",
                      children: [
                        a.jsxs("div", {
                          className: "grid grid-cols-1 md:grid-cols-4 gap-4",
                          children: [
                            a.jsxs("div", {
                              className:
                                "glass-panel p-5 rounded-2xl flex items-center space-x-4",
                              children: [
                                a.jsx("div", {
                                  className:
                                    "w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-brand-400",
                                  children: a.jsx(Uy, { className: "w-5 h-5" }),
                                }),
                                a.jsxs("div", {
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                      children: "Today's Sales",
                                    }),
                                    a.jsx("h3", {
                                      className:
                                        "text-lg font-extrabold mt-0.5 text-slate-100",
                                      children: os(g.todaySales),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className:
                                "glass-panel p-5 rounded-2xl flex items-center space-x-4",
                              children: [
                                a.jsx("div", {
                                  className:
                                    "w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400",
                                  children: a.jsx(rg, { className: "w-5 h-5" }),
                                }),
                                a.jsxs("div", {
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                      children: "Total Orders",
                                    }),
                                    a.jsx("h3", {
                                      className:
                                        "text-lg font-extrabold mt-0.5 text-slate-100",
                                      children: g.orderCount,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className:
                                "glass-panel p-5 rounded-2xl flex items-center space-x-4",
                              children: [
                                a.jsx("div", {
                                  className:
                                    "w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400",
                                  children: a.jsx(Ky, { className: "w-5 h-5" }),
                                }),
                                a.jsxs("div", {
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                      children: "Average Ticket",
                                    }),
                                    a.jsx("h3", {
                                      className:
                                        "text-lg font-extrabold mt-0.5 text-slate-100",
                                      children: os(g.avgTicket),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className:
                                "glass-panel p-5 rounded-2xl flex items-center space-x-4",
                              children: [
                                a.jsx("div", {
                                  className:
                                    "w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400",
                                  children: a.jsx(Gy, { className: "w-5 h-5" }),
                                }),
                                a.jsxs("div", {
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                      children: "AI Voice Sessions",
                                    }),
                                    a.jsxs("h3", {
                                      className:
                                        "text-lg font-extrabold mt-0.5 text-slate-100",
                                      children: [g.activeVoiceCalls, " Calls"],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "glass-panel p-6 rounded-2xl space-y-4",
                          children: [
                            a.jsx("h4", {
                              className: "font-bold text-xs text-slate-200",
                              children: "System Integration Status",
                            }),
                            a.jsxs("div", {
                              className:
                                "grid grid-cols-2 md:grid-cols-4 gap-4 pt-1",
                              children: [
                                a.jsxs("div", {
                                  className:
                                    "bg-slate-900/50 p-4 rounded-xl border border-slate-800/80",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] text-slate-500 uppercase font-bold",
                                      children: "Node Backend",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-xs text-emerald-400 font-semibold mt-1",
                                      children: "ONLINE / Railway",
                                    }),
                                  ],
                                }),
                                a.jsxs("div", {
                                  className:
                                    "bg-slate-900/50 p-4 rounded-xl border border-slate-800/80",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] text-slate-500 uppercase font-bold",
                                      children: "Gemini Live Gateway",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-xs text-emerald-400 font-semibold mt-1",
                                      children: "READY / WebSockets",
                                    }),
                                  ],
                                }),
                                a.jsxs("div", {
                                  className:
                                    "bg-slate-900/50 p-4 rounded-xl border border-slate-800/80",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] text-slate-500 uppercase font-bold",
                                      children: "Stripe Payments API",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-xs text-slate-400 font-semibold mt-1",
                                      children: "Mock Mode (Dev)",
                                    }),
                                  ],
                                }),
                                a.jsxs("div", {
                                  className:
                                    "bg-slate-900/50 p-4 rounded-xl border border-slate-800/80",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "text-[10px] text-slate-500 uppercase font-bold",
                                      children: "Kitchen ESC/POS Printer",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-xs text-slate-400 font-semibold mt-1",
                                      children: "Listening on TCP/9100",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  o === "products" &&
                    a.jsxs("div", {
                      className:
                        "grid grid-cols-1 lg:grid-cols-4 gap-6 h-full items-start",
                      children: [
                        a.jsxs("div", {
                          className:
                            "lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4",
                          children: [
                            a.jsxs("div", {
                              className:
                                "flex justify-between items-center pb-2 border-b border-slate-800",
                              children: [
                                a.jsx("span", {
                                  className:
                                    "text-xs font-extrabold uppercase text-slate-400 tracking-wider",
                                  children: "Folders",
                                }),
                                a.jsx("button", {
                                  onClick: () => Ga(),
                                  className:
                                    "p-1 hover:bg-slate-800 text-brand-400 rounded transition-colors",
                                  children: a.jsx(_t, { className: "w-4 h-4" }),
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1",
                              children: [
                                a.jsxs("button", {
                                  onClick: () => It(null),
                                  className: `w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${ye === null ? "bg-slate-800 text-slate-200" : "text-slate-400 hover:text-slate-200"}`,
                                  children: [
                                    a.jsx(By, {
                                      className:
                                        "w-4 h-4 shrink-0 text-slate-500",
                                    }),
                                    a.jsx("span", {
                                      children: "All Curries & Items",
                                    }),
                                  ],
                                }),
                                x0.map((u) => {
                                  const x = j.filter((C) => {
                                    var O;
                                    return typeof C.parent == "string"
                                      ? C.parent === u._id
                                      : ((O = C.parent) == null
                                          ? void 0
                                          : O._id) === u._id;
                                  });
                                  return a.jsxs(
                                    "div",
                                    {
                                      className: "space-y-0.5",
                                      children: [
                                        a.jsxs("div", {
                                          className:
                                            "group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors hover:bg-slate-800/40",
                                          children: [
                                            a.jsxs("button", {
                                              onClick: () => It(u._id),
                                              className: `flex-1 flex items-center space-x-2 text-left ${ye === u._id ? "text-slate-100" : "text-slate-400 hover:text-slate-200"}`,
                                              children: [
                                                a.jsx($y, {
                                                  className:
                                                    "w-4 h-4 shrink-0 text-amber-500",
                                                }),
                                                a.jsx("span", {
                                                  className: "truncate",
                                                  children: u.name,
                                                }),
                                              ],
                                            }),
                                            a.jsxs("div", {
                                              className:
                                                "hidden group-hover:flex items-center space-x-1",
                                              children: [
                                                a.jsx("button", {
                                                  onClick: () => Ga(u),
                                                  className:
                                                    "p-0.5 text-slate-500 hover:text-brand-400",
                                                  children: a.jsx(Pt, {
                                                    className: "w-3.5 h-3.5",
                                                  }),
                                                }),
                                                a.jsx("button", {
                                                  onClick: () => Qu(u._id),
                                                  className:
                                                    "p-0.5 text-slate-500 hover:text-rose-400",
                                                  children: a.jsx(Rt, {
                                                    className: "w-3.5 h-3.5",
                                                  }),
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                        x.length > 0 &&
                                          a.jsx("div", {
                                            className:
                                              "pl-6 border-l border-slate-800 space-y-0.5",
                                            children: x.map((C) =>
                                              a.jsxs(
                                                "div",
                                                {
                                                  className:
                                                    "group flex items-center justify-between px-3 py-1 rounded-lg text-[11px] font-medium hover:bg-slate-800/40",
                                                  children: [
                                                    a.jsxs("button", {
                                                      onClick: () => It(C._id),
                                                      className: `flex-1 text-left truncate ${ye === C._id ? "text-brand-400 font-bold" : "text-slate-500 hover:text-slate-300"}`,
                                                      children: ["↳ ", C.name],
                                                    }),
                                                    a.jsxs("div", {
                                                      className:
                                                        "hidden group-hover:flex items-center space-x-1",
                                                      children: [
                                                        a.jsx("button", {
                                                          onClick: () => Ga(C),
                                                          className:
                                                            "p-0.5 text-slate-600 hover:text-brand-400",
                                                          children: a.jsx(Pt, {
                                                            className:
                                                              "w-3 h-3",
                                                          }),
                                                        }),
                                                        a.jsx("button", {
                                                          onClick: () =>
                                                            Qu(C._id),
                                                          className:
                                                            "p-0.5 text-slate-600 hover:text-rose-400",
                                                          children: a.jsx(Rt, {
                                                            className:
                                                              "w-3 h-3",
                                                          }),
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                },
                                                C._id,
                                              ),
                                            ),
                                          }),
                                      ],
                                    },
                                    u._id,
                                  );
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "lg:col-span-3 space-y-4",
                          children: [
                            a.jsxs("div", {
                              className: "flex justify-between items-center",
                              children: [
                                a.jsxs("div", {
                                  children: [
                                    a.jsx("h3", {
                                      className:
                                        "text-sm font-extrabold text-slate-200",
                                      children: ec ? ec.name : "ALL MENU ITEMS",
                                    }),
                                    a.jsx("p", {
                                      className: "text-[10px] text-slate-500",
                                      children:
                                        "Products list inside folder. Click Create Product to add menu items.",
                                    }),
                                  ],
                                }),
                                a.jsxs("button", {
                                  onClick: () => qu(),
                                  className:
                                    "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                                  children: [
                                    a.jsx(_t, { className: "w-4 h-4" }),
                                    a.jsx("span", {
                                      children: "Create Product",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsx("div", {
                              className:
                                "glass-panel rounded-2xl overflow-hidden",
                              children: a.jsxs("table", {
                                className: "w-full text-left border-collapse",
                                children: [
                                  a.jsx("thead", {
                                    children: a.jsxs("tr", {
                                      className:
                                        "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                      children: [
                                        a.jsx("th", {
                                          className: "p-4 pl-6",
                                          children: "Grid/Visual",
                                        }),
                                        a.jsx("th", {
                                          className: "p-4",
                                          children: "Name",
                                        }),
                                        a.jsx("th", {
                                          className: "p-4",
                                          children: "Category Folder",
                                        }),
                                        a.jsx("th", {
                                          className: "p-4",
                                          children: "Price",
                                        }),
                                        a.jsx("th", {
                                          className: "p-4",
                                          children: "Status",
                                        }),
                                        a.jsx("th", {
                                          className: "p-4 pr-6 text-right",
                                          children: "Actions",
                                        }),
                                      ],
                                    }),
                                  }),
                                  a.jsxs("tbody", {
                                    children: [
                                      tc.map((u) => {
                                        const x = j.find((C) => {
                                          var O;
                                          return (
                                            C._id ===
                                            (typeof u.category == "string"
                                              ? u.category
                                              : (O = u.category) == null
                                                ? void 0
                                                : O._id)
                                          );
                                        });
                                        return a.jsxs(
                                          "tr",
                                          {
                                            className:
                                              "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                            children: [
                                              a.jsx("td", {
                                                className: "p-4 pl-6",
                                                children: a.jsx("span", {
                                                  className:
                                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-md uppercase",
                                                  style: {
                                                    backgroundColor:
                                                      u.backgroundColor ||
                                                      "#1e293b",
                                                    color:
                                                      u.textColor || "#ffffff",
                                                  },
                                                  children:
                                                    u.menuCode || "NO CODE",
                                                }),
                                              }),
                                              a.jsx("td", {
                                                className:
                                                  "p-4 font-semibold text-slate-200",
                                                children: u.name,
                                              }),
                                              a.jsx("td", {
                                                className: "p-4 text-slate-400",
                                                children: x
                                                  ? x.name
                                                  : "Unassigned",
                                              }),
                                              a.jsx("td", {
                                                className:
                                                  "p-4 font-medium text-slate-300",
                                                children: os(u.pricePence),
                                              }),
                                              a.jsx("td", {
                                                className: "p-4",
                                                children: a.jsx("button", {
                                                  onClick: () =>
                                                    Jh(u._id, u.isAvailable),
                                                  className: `flex items-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer ${u.isAvailable ? "text-emerald-400" : "text-slate-500"}`,
                                                  children: u.isAvailable
                                                    ? a.jsxs(a.Fragment, {
                                                        children: [
                                                          a.jsx(ng, {
                                                            className:
                                                              "w-5 h-5 text-emerald-400",
                                                          }),
                                                          a.jsx("span", {
                                                            children:
                                                              "Available",
                                                          }),
                                                        ],
                                                      })
                                                    : a.jsxs(a.Fragment, {
                                                        children: [
                                                          a.jsx(tg, {
                                                            className:
                                                              "w-5 h-5 text-slate-600",
                                                          }),
                                                          a.jsx("span", {
                                                            children:
                                                              "Disabled",
                                                          }),
                                                        ],
                                                      }),
                                                }),
                                              }),
                                              a.jsxs("td", {
                                                className:
                                                  "p-4 pr-6 text-right space-x-2",
                                                children: [
                                                  a.jsx("button", {
                                                    onClick: () => qu(u),
                                                    className:
                                                      "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                    children: a.jsx(Pt, {
                                                      className: "w-4 h-4",
                                                    }),
                                                  }),
                                                  a.jsx("button", {
                                                    onClick: () => t0(u._id),
                                                    className:
                                                      "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                    children: a.jsx(Rt, {
                                                      className: "w-4 h-4",
                                                    }),
                                                  }),
                                                ],
                                              }),
                                            ],
                                          },
                                          u._id,
                                        );
                                      }),
                                      tc.length === 0 &&
                                        a.jsx("tr", {
                                          children: a.jsx("td", {
                                            colSpan: 6,
                                            className:
                                              "p-8 text-center text-xs text-slate-500",
                                            children:
                                              "No menu products found under this category level.",
                                          }),
                                        }),
                                    ],
                                  }),
                                ],
                              }),
                            }),
                          ],
                        }),
                      ],
                    }),
                  o === "groups" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Manage modifier clusters (e.g. Choose Pizza Size, SFC Sauce choice, Extra Balti toppings).",
                            }),
                            a.jsxs("button", {
                              onClick: () => Wu(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", { children: "Create Group" }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className: "glass-panel rounded-2xl overflow-hidden",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Group Title",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Heading overlay",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Selection type",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Limits (Min/Max)",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Options size",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Status",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  p.map((u) => {
                                    var x;
                                    return a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className:
                                              "p-4 pl-6 font-semibold text-slate-200",
                                            children: u.name,
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 text-slate-400 font-mono text-[11px]",
                                            children:
                                              u.dashboardHeading ||
                                              "No Heading",
                                          }),
                                          a.jsxs("td", {
                                            className: "p-4 capitalize",
                                            children: [
                                              u.selectionType,
                                              " (",
                                              u.type,
                                              ")",
                                            ],
                                          }),
                                          a.jsxs("td", {
                                            className: "p-4",
                                            children: [
                                              u.minSelections,
                                              " - ",
                                              u.maxSelections,
                                            ],
                                          }),
                                          a.jsxs("td", {
                                            className: "p-4",
                                            children: [
                                              ((x = u.options) == null
                                                ? void 0
                                                : x.length) || 0,
                                              " Components",
                                            ],
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Wu(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => r0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    );
                                  }),
                                  p.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 7,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No modifier groups configured. Click Create Group to seed one.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "components" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Global repository of extra add-ons/variations (Potatoes, Mushrooms, Chick Tikka, Go Large).",
                            }),
                            a.jsxs("button", {
                              onClick: () => Ku(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", { children: "Add Component" }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className: "glass-panel rounded-2xl overflow-hidden",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Tag Styling",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Component name",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Description",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Default Price Delta",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Active",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  v.map((u) =>
                                    a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className: "p-4 pl-6",
                                            children: a.jsx("span", {
                                              className:
                                                "px-3 py-1 rounded text-[10px] font-bold font-mono",
                                              style: {
                                                backgroundColor:
                                                  u.color || "#1e293b",
                                                color: u.textColor || "#ffffff",
                                              },
                                              children: "TAG COLOR",
                                            }),
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 font-semibold text-slate-200",
                                            children: u.name,
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 text-slate-400 max-w-xs truncate",
                                            children:
                                              u.description || "No description",
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: os(
                                              u.defaultPriceDeltaPence,
                                            ),
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Ku(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => l0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    ),
                                  ),
                                  v.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 6,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No ingredients component database seeded. Click Add Component to start.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "labels" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Manage cooking instruction labels (NO, LESS, ON HALF, ALL OVER) that modify components.",
                            }),
                            a.jsxs("button", {
                              onClick: () => Gu(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", { children: "Create Label" }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className:
                            "glass-panel rounded-2xl overflow-hidden max-w-2xl",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Label display preview",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Active",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  _.map((u) =>
                                    a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className: "p-4 pl-6",
                                            children: a.jsx("span", {
                                              className:
                                                "px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md",
                                              style: {
                                                backgroundColor:
                                                  u.backgroundColor,
                                                color: u.textColor,
                                              },
                                              children: u.name,
                                            }),
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Gu(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => o0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    ),
                                  ),
                                  _.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 3,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No descriptors labels seeded.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "manual-products" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Dynamic templates for typing one-off customized item requests on the terminal.",
                            }),
                            a.jsxs("button", {
                              onClick: () => Xu(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", {
                                  children: "Create Manual Product",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className: "glass-panel rounded-2xl overflow-hidden",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Visual Tag",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Name",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Code",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Price",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Print Route",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Status",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  U.map((u) =>
                                    a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className: "p-4 pl-6",
                                            children: a.jsx("span", {
                                              className:
                                                "px-2 py-1 rounded text-[10px] font-bold text-white shadow",
                                              style: {
                                                backgroundColor:
                                                  u.color || "#3b82f6",
                                              },
                                              children: "MANUAL",
                                            }),
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 font-semibold text-slate-200",
                                            children: u.name,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4 font-mono",
                                            children: u.code || "None",
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: os(u.pricePence),
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 capitalize text-slate-400",
                                            children: u.printOption,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Xu(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => u0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    ),
                                  ),
                                  U.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 7,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No manual products configured.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "shorthands" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Abbreviations to save space when printing ticket orders (e.g. Margherita to Marg).",
                            }),
                            a.jsxs("button", {
                              onClick: () => Yu(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", { children: "Add Shorthand" }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className:
                            "glass-panel rounded-2xl overflow-hidden max-w-4xl",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Product name",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Shorthand code",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 text-center",
                                      children: "Receipt print",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 text-center",
                                      children: "Kitchen ticket",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Status",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  Ze.map((u) => {
                                    const x = N.find((C) => {
                                      var O;
                                      return (
                                        C._id ===
                                        (typeof u.menuItem == "string"
                                          ? u.menuItem
                                          : (O = u.menuItem) == null
                                            ? void 0
                                            : O._id)
                                      );
                                    });
                                    return a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className:
                                              "p-4 pl-6 font-semibold text-slate-200",
                                            children: x
                                              ? x.name
                                              : "Unknown Product",
                                          }),
                                          a.jsx("td", {
                                            className:
                                              "p-4 font-bold text-brand-400 font-mono",
                                            children: u.shorthandCode,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4 text-center",
                                            children: u.printOnReceipt
                                              ? "✅ Yes"
                                              : "❌ No",
                                          }),
                                          a.jsx("td", {
                                            className: "p-4 text-center",
                                            children: u.printOnTicket
                                              ? "✅ Yes"
                                              : "❌ No",
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Yu(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => d0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    );
                                  }),
                                  Ze.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 6,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No shorthand print rules configured.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "departments" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Kitchen print routing groups (Pizza station front, Kebab station, Curries back kitchen).",
                            }),
                            a.jsxs("button", {
                              onClick: () => Ju(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", {
                                  children: "Create Department",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className:
                            "glass-panel rounded-2xl overflow-hidden max-w-2xl",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Department Name",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Status",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  R.map((u) =>
                                    a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className:
                                              "p-4 pl-6 font-semibold text-slate-200",
                                            children: u.name,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Ju(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => p0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    ),
                                  ),
                                  R.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 3,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No routing departments configured.",
                                      }),
                                    }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                  o === "product-times" &&
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "flex justify-between items-center",
                          children: [
                            a.jsx("span", {
                              className: "text-xs text-slate-400",
                              children:
                                "Configure active menu scheduling slots (Breakfast, Lunch menu, Late Night Grill).",
                            }),
                            a.jsxs("button", {
                              onClick: () => Zu(),
                              className:
                                "px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                              children: [
                                a.jsx(_t, { className: "w-4 h-4" }),
                                a.jsx("span", { children: "Add Time Shift" }),
                              ],
                            }),
                          ],
                        }),
                        a.jsx("div", {
                          className:
                            "glass-panel rounded-2xl overflow-hidden max-w-3xl",
                          children: a.jsxs("table", {
                            className: "w-full text-left border-collapse",
                            children: [
                              a.jsx("thead", {
                                children: a.jsxs("tr", {
                                  className:
                                    "border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider",
                                  children: [
                                    a.jsx("th", {
                                      className: "p-4 pl-6",
                                      children: "Shift Name",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Start Time",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "End Time",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4",
                                      children: "Status",
                                    }),
                                    a.jsx("th", {
                                      className: "p-4 pr-6 text-right",
                                      children: "Actions",
                                    }),
                                  ],
                                }),
                              }),
                              a.jsxs("tbody", {
                                children: [
                                  Te.map((u) =>
                                    a.jsxs(
                                      "tr",
                                      {
                                        className:
                                          "border-b border-slate-900/50 hover:bg-slate-900/25 transition-colors text-xs text-slate-300",
                                        children: [
                                          a.jsx("td", {
                                            className:
                                              "p-4 pl-6 font-semibold text-slate-200",
                                            children: u.name,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4 font-mono",
                                            children: u.startTime,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4 font-mono",
                                            children: u.endTime,
                                          }),
                                          a.jsx("td", {
                                            className: "p-4",
                                            children: a.jsx("span", {
                                              className: `px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive !== !1 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`,
                                              children:
                                                u.isActive !== !1
                                                  ? "Active"
                                                  : "Disabled",
                                            }),
                                          }),
                                          a.jsxs("td", {
                                            className:
                                              "p-4 pr-6 text-right space-x-2",
                                            children: [
                                              a.jsx("button", {
                                                onClick: () => Zu(u),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400 transition-colors",
                                                children: a.jsx(Pt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                              a.jsx("button", {
                                                onClick: () => m0(u._id),
                                                className:
                                                  "p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors",
                                                children: a.jsx(Rt, {
                                                  className: "w-4 h-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                        ],
                                      },
                                      u._id,
                                    ),
                                  ),
                                  Te.length === 0 &&
                                    a.jsx("tr", {
                                      children: a.jsx("td", {
                                        colSpan: 5,
                                        className:
                                          "p-8 text-center text-xs text-slate-500",
                                        children:
                                          "No product times shifts defined.",
                                      }),
                                    }),
                                ],
