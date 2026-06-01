                              }),
                            ],
                          }),
                        }),
                      ],
                    }),
                ],
              }),
            ],
          }),
          A &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: Zh,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: z
                            ? "Update Category"
                            : "Create Category Folder",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => I(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    c &&
                      a.jsxs("div", {
                        className:
                          "mx-5 mt-4 p-3 bg-rose-950/30 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center space-x-2 shrink-0",
                        children: [
                          a.jsx(Rl, {
                            className: "w-4 h-4 text-rose-400 shrink-0",
                          }),
                          a.jsx("span", { children: c }),
                        ],
                      }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Category Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: K.name,
                              onChange: (u) =>
                                J((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. CURRIES",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Sort displayOrder",
                            }),
                            a.jsx("input", {
                              type: "number",
                              required: !0,
                              value: K.displayOrder,
                              onChange: (u) =>
                                J((x) => ({
                                  ...x,
                                  displayOrder: parseInt(u.target.value) || 1,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Parent Category (For Sub-categories)",
                            }),
                            a.jsxs("select", {
                              value: K.parent,
                              onChange: (u) =>
                                J((x) => ({ ...x, parent: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: [
                                a.jsx("option", {
                                  value: "",
                                  children: "None (Top Level Category)",
                                }),
                                j
                                  .filter(
                                    (u) => !u.parent && (!z || u._id !== z._id),
                                  )
                                  .map((u) =>
                                    a.jsx(
                                      "option",
                                      { value: u._id, children: u.name },
                                      u._id,
                                    ),
                                  ),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Printer route department",
                            }),
                            a.jsxs("select", {
                              value: K.department,
                              onChange: (u) =>
                                J((x) => ({
                                  ...x,
                                  department: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: [
                                a.jsx("option", {
                                  value: "",
                                  children: "No Routing",
                                }),
                                R.map((u) =>
                                  a.jsx(
                                    "option",
                                    { value: u._id, children: u.name },
                                    u._id,
                                  ),
                                ),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Preset grid colors",
                            }),
                            a.jsx("div", {
                              className: "grid grid-cols-4 gap-2",
                              children: cs.map((u) =>
                                a.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () =>
                                      J((x) => ({
                                        ...x,
                                        backgroundColor: u.bg,
                                        textColor: u.text,
                                      })),
                                    className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${K.backgroundColor === u.bg ? "border-brand-500 scale-105" : "border-slate-800 hover:border-slate-700"}`,
                                    style: {
                                      backgroundColor: u.bg,
                                      color: u.text,
                                    },
                                    children: u.label,
                                  },
                                  u.bg,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => I(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Folder" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Ne &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: e0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Ie ? "Update Product" : "Create Product",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ge(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    c &&
                      a.jsxs("div", {
                        className:
                          "mx-5 mt-4 p-3 bg-rose-950/30 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center space-x-2 shrink-0",
                        children: [
                          a.jsx(Rl, {
                            className: "w-4 h-4 text-rose-400 shrink-0",
                          }),
                          a.jsx("span", { children: c }),
                        ],
                      }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Target Category Folder",
                            }),
                            a.jsx("select", {
                              value: B.category,
                              onChange: (u) =>
                                ve((x) => ({ ...x, category: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: j.map((u) =>
                                a.jsx(
                                  "option",
                                  {
                                    value: u._id,
                                    children: u.parent ? `↳ ${u.name}` : u.name,
                                  },
                                  u._id,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Product Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: B.name,
                              onChange: (u) =>
                                ve((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. CHICKEN BALTI",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Price (GBP)",
                                }),
                                a.jsxs("div", {
                                  className: "relative",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "absolute left-3 top-2.5 text-slate-500 text-sm",
                                      children: "£",
                                    }),
                                    a.jsx("input", {
                                      type: "number",
                                      step: "0.01",
                                      required: !0,
                                      value: B.pricePounds,
                                      onChange: (u) =>
                                        ve((x) => ({
                                          ...x,
                                          pricePounds: u.target.value,
                                        })),
                                      className:
                                        "w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-200",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "VAT Rate",
                                }),
                                a.jsx("select", {
                                  value: B.vatRate,
                                  onChange: (u) =>
                                    ve((x) => ({
                                      ...x,
                                      vatRate: parseInt(u.target.value),
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  children: sg.map((u) =>
                                    a.jsx(
                                      "option",
                                      { value: u.value, children: u.label },
                                      u.value,
                                    ),
                                  ),
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Kitchen Code",
                            }),
                            a.jsx("input", {
                              type: "text",
                              value: B.menuCode,
                              onChange: (u) =>
                                ve((x) => ({ ...x, menuCode: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. CUR-01",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Print routing target",
                            }),
                            a.jsxs("select", {
                              value: B.printOption,
                              onChange: (u) =>
                                ve((x) => ({
                                  ...x,
                                  printOption: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: [
                                a.jsx("option", {
                                  value: "both",
                                  children: "Both Receipt and Chef Ticket",
                                }),
                                a.jsx("option", {
                                  value: "ticket",
                                  children: "Chef Ticket Only",
                                }),
                                a.jsx("option", {
                                  value: "receipt",
                                  children: "Customer Receipt Only",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Description",
                            }),
                            a.jsx("textarea", {
                              value: B.description,
                              onChange: (u) =>
                                ve((x) => ({
                                  ...x,
                                  description: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 h-16",
                              placeholder: "Describe ingredients...",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Product Image URL",
                            }),
                            a.jsx("input", {
                              type: "text",
                              value: B.imageUrl,
                              onChange: (u) =>
                                ve((x) => ({ ...x, imageUrl: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder:
                                "e.g. https://images.unsplash.com/...",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Visual Grid colors",
                            }),
                            a.jsx("div", {
                              className: "grid grid-cols-4 gap-2",
                              children: cs.map((u) =>
                                a.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () =>
                                      ve((x) => ({
                                        ...x,
                                        backgroundColor: u.bg,
                                        textColor: u.text,
                                      })),
                                    className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${B.backgroundColor === u.bg ? "border-brand-500 scale-105" : "border-slate-800 hover:border-slate-700"}`,
                                    style: {
                                      backgroundColor: u.bg,
                                      color: u.text,
                                    },
                                    children: u.label,
                                  },
                                  u.bg,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Attached Modifier Groups",
                            }),
                            a.jsx("div", {
                              className:
                                "space-y-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800",
                              children: p.map((u) =>
                                a.jsxs(
                                  "label",
                                  {
                                    className:
                                      "flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer",
                                    children: [
                                      a.jsx("input", {
                                        type: "checkbox",
                                        checked: B.selectedModifiers.includes(
                                          u._id,
                                        ),
                                        onChange: (x) => {
                                          const C = x.target.checked;
                                          ve((O) => ({
                                            ...O,
                                            selectedModifiers: C
                                              ? [...O.selectedModifiers, u._id]
                                              : O.selectedModifiers.filter(
                                                  (H) => H !== u._id,
                                                ),
                                          }));
                                        },
                                        className:
                                          "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                                      }),
                                      a.jsxs("span", {
                                        children: [
                                          u.name,
                                          " (Min: ",
                                          u.minSelections,
                                          ", Max: ",
                                          u.maxSelections,
                                          ")",
                                        ],
                                      }),
                                    ],
                                  },
                                  u._id,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ge(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Product" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          rr &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: n0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: sr
                            ? "Update Modifier Group"
                            : "Create Modifier Group",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => Ut(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    c &&
                      a.jsxs("div", {
                        className:
                          "mx-5 mt-4 p-3 bg-rose-950/30 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center space-x-2 shrink-0",
                        children: [
                          a.jsx(Rl, {
                            className: "w-4 h-4 text-rose-400 shrink-0",
                          }),
                          a.jsx("span", { children: c }),
                        ],
                      }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Internal Group Title",
                                }),
                                a.jsx("input", {
                                  type: "text",
                                  required: !0,
                                  value: Y.name,
                                  onChange: (u) =>
                                    Ee((x) => ({ ...x, name: u.target.value })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  placeholder: "e.g. Choose your size",
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Customer Display Name",
                                }),
                                a.jsx("input", {
                                  type: "text",
                                  value: Y.displayName,
                                  onChange: (u) =>
                                    Ee((x) => ({
                                      ...x,
                                      displayName: u.target.value,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  placeholder: "e.g. Pizza Size",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Dashboard Header Overlay",
                            }),
                            a.jsx("input", {
                              type: "text",
                              value: Y.dashboardHeading,
                              onChange: (u) =>
                                Ee((x) => ({
                                  ...x,
                                  dashboardHeading: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. EXTRA ADDONS FOR CURRIES",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "grid grid-cols-3 gap-3",
                          children: [
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Select Mode",
                                }),
                                a.jsxs("select", {
                                  value: Y.selectionType,
                                  onChange: (u) =>
                                    Ee((x) => ({
                                      ...x,
                                      selectionType: u.target.value,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] text-slate-200",
                                  children: [
                                    a.jsx("option", {
                                      value: "single",
                                      children: "Single Select",
                                    }),
                                    a.jsx("option", {
                                      value: "multiple",
                                      children: "Multiple Select",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Min selections",
                                }),
                                a.jsx("input", {
                                  type: "number",
                                  value: Y.minSelections,
                                  onChange: (u) =>
                                    Ee((x) => ({
                                      ...x,
                                      minSelections:
                                        parseInt(u.target.value) || 0,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200",
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Max selections",
                                }),
                                a.jsx("input", {
                                  type: "number",
                                  value: Y.maxSelections,
                                  onChange: (u) =>
                                    Ee((x) => ({
                                      ...x,
                                      maxSelections:
                                        parseInt(u.target.value) || 1,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className:
                            "grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80",
                          children: [
                            a.jsxs("label", {
                              className:
                                "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                              children: [
                                a.jsx("input", {
                                  type: "checkbox",
                                  checked: Y.samePrice,
                                  onChange: (u) =>
                                    Ee((x) => ({
                                      ...x,
                                      samePrice: u.target.checked,
                                    })),
                                  className:
                                    "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                                }),
                                a.jsx("span", {
                                  children: "Same Price For Options",
                                }),
                              ],
                            }),
                            Y.samePrice &&
                              a.jsxs("div", {
                                className: "relative",
                                children: [
                                  a.jsx("span", {
                                    className:
                                      "absolute left-2.5 top-2 text-slate-500 text-xs",
                                    children: "£",
                                  }),
                                  a.jsx("input", {
                                    type: "number",
                                    step: "0.01",
                                    value: Y.samePricePounds,
                                    onChange: (u) =>
                                      Ee((x) => ({
                                        ...x,
                                        samePricePounds: u.target.value,
                                      })),
                                    className:
                                      "w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200",
                                  }),
                                ],
                              }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: Y.staticLabelsEnabled,
                              onChange: (u) =>
                                Ee((x) => ({
                                  ...x,
                                  staticLabelsEnabled: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", {
                              children:
                                "Enable quantity modify Labels (LESS, NO, ON HALF)",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsxs("div", {
                              className: "flex justify-between items-center",
                              children: [
                                a.jsx("span", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Selectable Option components",
                                }),
                                a.jsxs("button", {
                                  type: "button",
                                  onClick: () =>
                                    Ee((u) => ({
                                      ...u,
                                      options: [
                                        ...u.options,
                                        {
                                          component: "",
                                          name: "",
                                          pricePounds: "0.00",
                                          isDefault: !1,
                                        },
                                      ],
                                    })),
                                  className:
                                    "text-[10px] font-bold text-brand-400 hover:text-brand-300 flex items-center space-x-1",
                                  children: [
                                    a.jsx(_t, { className: "w-3.5 h-3.5" }),
                                    a.jsx("span", {
                                      children: "Add Option Row",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className:
                                "space-y-2 max-h-56 overflow-y-auto p-2.5 bg-slate-950 rounded-xl border border-slate-850",
                              children: [
                                Y.options.map((u, x) =>
                                  a.jsxs(
                                    "div",
                                    {
                                      className:
                                        "flex items-center space-x-2 bg-slate-900 p-2 rounded-lg border border-slate-800",
                                      children: [
                                        a.jsxs("select", {
                                          value: u.component,
                                          onChange: (C) => {
                                            const O = C.target.value,
                                              H = v.find((or) => or._id === O),
                                              fe = H ? H.name : "",
                                              Xa = H
                                                ? ur(
                                                    H.defaultPriceDeltaPence,
                                                  ).toFixed(2)
                                                : "0.00";
                                            Ee((or) => {
                                              const Jr = [...or.options];
                                              return (
                                                (Jr[x] = {
                                                  ...Jr[x],
                                                  component: O,
                                                  name: fe,
                                                  pricePounds: Xa,
                                                }),
                                                { ...or, options: Jr }
                                              );
                                            });
                                          },
                                          className:
                                            "bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[11px] text-slate-200 flex-1",
                                          children: [
                                            a.jsx("option", {
                                              value: "",
                                              children:
                                                "-- Choose Component --",
                                            }),
                                            v.map((C) =>
                                              a.jsx(
                                                "option",
                                                {
                                                  value: C._id,
                                                  children: C.name,
                                                },
                                                C._id,
                                              ),
                                            ),
                                          ],
                                        }),
                                        a.jsx("input", {
                                          type: "text",
                                          required: !0,
                                          value: u.name,
                                          onChange: (C) =>
                                            Ee((O) => {
                                              const H = [...O.options];
                                              return (
                                                (H[x].name = C.target.value),
                                                { ...O, options: H }
                                              );
                                            }),
                                          placeholder: "Display Name",
                                          className:
                                            "w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[11px] text-slate-200",
                                        }),
                                        !Y.samePrice &&
                                          a.jsxs("div", {
                                            className: "relative w-16",
                                            children: [
                                              a.jsx("span", {
                                                className:
                                                  "absolute left-1.5 top-1.5 text-slate-500 text-[10px]",
                                                children: "£",
                                              }),
                                              a.jsx("input", {
                                                type: "number",
                                                step: "0.01",
                                                value: u.pricePounds,
                                                onChange: (C) =>
                                                  Ee((O) => {
                                                    const H = [...O.options];
                                                    return (
                                                      (H[x].pricePounds =
                                                        C.target.value),
                                                      { ...O, options: H }
                                                    );
                                                  }),
                                                className:
                                                  "w-full bg-slate-950 border border-slate-800 rounded pl-4 pr-1 py-1.5 text-[10px] text-slate-200 text-right",
                                              }),
                                            ],
                                          }),
                                        a.jsxs("label", {
                                          className:
                                            "flex items-center space-x-1 shrink-0 cursor-pointer",
                                          children: [
                                            a.jsx("input", {
                                              type: "checkbox",
                                              checked: u.isDefault,
                                              onChange: (C) =>
                                                Ee((O) => {
                                                  const H = [...O.options];
                                                  return (
                                                    Y.selectionType ===
                                                      "single" &&
                                                      C.target.checked &&
                                                      H.forEach(
                                                        (fe) =>
                                                          (fe.isDefault = !1),
                                                      ),
                                                    (H[x].isDefault =
                                                      C.target.checked),
                                                    { ...O, options: H }
                                                  );
                                                }),
                                              className:
                                                "rounded text-brand-500 bg-slate-950 border-slate-850 w-3.5 h-3.5",
                                            }),
                                            a.jsx("span", {
                                              className:
                                                "text-[10px] text-slate-500",
                                              children: "Def",
                                            }),
                                          ],
                                        }),
                                        a.jsx("button", {
                                          type: "button",
                                          onClick: () =>
                                            Ee((C) => ({
                                              ...C,
                                              options: C.options.filter(
                                                (O, H) => H !== x,
                                              ),
                                            })),
                                          className:
                                            "p-1 hover:bg-slate-800 text-rose-500 rounded",
                                          children: a.jsx(Ot, {
                                            className: "w-3.5 h-3.5",
                                          }),
                                        }),
                                      ],
                                    },
                                    x,
                                  ),
                                ),
                                Y.options.length === 0 &&
                                  a.jsx("span", {
                                    className:
                                      "text-[11px] text-slate-500 block text-center py-4",
                                    children:
                                      "No custom component items added. Link components above.",
                                  }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => Ut(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Group" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Vh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: s0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Ha
                            ? "Update Component"
                            : "Add Component Ingredient",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => rl(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Ingredient Component Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: mt.name,
                              onChange: (u) =>
                                Rn((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. MUSHROOMS",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Default Price Surcharge (GBP)",
                            }),
                            a.jsxs("div", {
                              className: "relative",
                              children: [
                                a.jsx("span", {
                                  className:
                                    "absolute left-3 top-2.5 text-slate-500 text-sm",
                                  children: "£",
                                }),
                                a.jsx("input", {
                                  type: "number",
                                  step: "0.01",
                                  required: !0,
                                  value: mt.defaultPricePounds,
                                  onChange: (u) =>
                                    Rn((x) => ({
                                      ...x,
                                      defaultPricePounds: u.target.value,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-200",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Description",
                            }),
                            a.jsx("textarea", {
                              value: mt.description,
                              onChange: (u) =>
                                Rn((x) => ({
                                  ...x,
                                  description: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 h-16",
                              placeholder: "Optional descriptions...",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Visual Grid colors",
                            }),
                            a.jsx("div", {
                              className: "grid grid-cols-4 gap-2",
                              children: cs.map((u) =>
                                a.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () =>
                                      Rn((x) => ({
                                        ...x,
                                        color: u.bg,
                                        textColor: u.text,
                                      })),
                                    className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${mt.color === u.bg ? "border-brand-500 scale-105" : "border-slate-800 hover:border-slate-700"}`,
                                    style: {
                                      backgroundColor: u.bg,
                                      color: u.text,
                                    },
                                    children: u.label,
                                  },
                                  u.bg,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: mt.isActive,
                              onChange: (u) =>
                                Rn((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", { children: "Active in database" }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => rl(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Ingredient" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Qh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: a0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Va
                            ? "Update Label"
                            : "Create Label Instruction",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => sl(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Instruction Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: Xr.name,
                              onChange: (u) =>
                                Yr((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. NO or LESS or ON HALF",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Preset overlay styling",
                            }),
                            a.jsx("div", {
                              className: "grid grid-cols-4 gap-2",
                              children: cs.map((u) =>
                                a.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () =>
                                      Yr((x) => ({
                                        ...x,
                                        backgroundColor: u.bg,
                                        textColor: u.text,
                                      })),
                                    className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${Xr.backgroundColor === u.bg ? "border-brand-500 scale-105" : "border-slate-800 hover:border-slate-700"}`,
                                    style: {
                                      backgroundColor: u.bg,
                                      color: u.text,
                                    },
                                    children: u.label,
                                  },
                                  u.bg,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: Xr.isActive,
                              onChange: (u) =>
                                Yr((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", {
                              children: "Active descriptor status",
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => sl(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Label" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          qh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: i0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Qa
                            ? "Update Manual Product"
                            : "Create Manual Product",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ll(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Manual Product Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: Ue.name,
                              onChange: (u) =>
                                Bt((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. Dynamic Custom Curries",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Quick Code",
                                }),
                                a.jsx("input", {
                                  type: "text",
                                  value: Ue.code,
                                  onChange: (u) =>
                                    Bt((x) => ({ ...x, code: u.target.value })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  placeholder: "e.g. MAN-99",
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Price (GBP)",
                                }),
                                a.jsxs("div", {
                                  className: "relative",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "absolute left-2.5 top-2 text-slate-500 text-xs",
                                      children: "£",
                                    }),
                                    a.jsx("input", {
                                      type: "number",
                                      step: "0.01",
                                      value: Ue.pricePounds,
                                      onChange: (u) =>
                                        Bt((x) => ({
                                          ...x,
                                          pricePounds: u.target.value,
                                        })),
                                      className:
                                        "w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-2 py-2.5 text-xs text-slate-200",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Target Category Folder",
                            }),
                            a.jsxs("select", {
                              value: Ue.category,
                              onChange: (u) =>
                                Bt((x) => ({ ...x, category: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: [
                                a.jsx("option", {
                                  value: "",
                                  children: "Unassigned Folder",
                                }),
                                j.map((u) =>
                                  a.jsx(
                                    "option",
                                    { value: u._id, children: u.name },
                                    u._id,
                                  ),
                                ),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Kitchen print routing",
                            }),
                            a.jsxs("select", {
                              value: Ue.printOption,
                              onChange: (u) =>
                                Bt((x) => ({
                                  ...x,
                                  printOption: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: [
                                a.jsx("option", {
                                  value: "both",
                                  children: "Both Receipt and Chef Ticket",
                                }),
                                a.jsx("option", {
                                  value: "ticket",
                                  children: "Chef Ticket Only",
                                }),
                                a.jsx("option", {
                                  value: "receipt",
                                  children: "Customer Receipt Only",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-2",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Visual button Color",
                            }),
                            a.jsx("div", {
                              className: "grid grid-cols-4 gap-2",
                              children: cs.map((u) =>
                                a.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () =>
                                      Bt((x) => ({ ...x, color: u.bg })),
                                    className: `p-2 rounded-xl text-[10px] font-bold border transition-all ${Ue.color === u.bg ? "border-brand-500 scale-105" : "border-slate-800 hover:border-slate-700"}`,
                                    style: {
                                      backgroundColor: u.bg,
                                      color: "#ffffff",
                                    },
                                    children: u.label,
                                  },
                                  u.bg,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: Ue.isActive,
                              onChange: (u) =>
                                Bt((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", { children: "Active on terminal" }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ll(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Manual" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Wh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: c0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: qa
                            ? "Update Shorthand Abbrev"
                            : "Create Shorthand Abbrev",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => al(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Target Menu Item",
                            }),
                            a.jsx("select", {
                              value: On.menuItem,
                              onChange: (u) =>
                                Tn((x) => ({ ...x, menuItem: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              children: N.map((u) =>
                                a.jsx(
                                  "option",
                                  { value: u._id, children: u.name },
                                  u._id,
                                ),
                              ),
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Shorthand Abbreviation Code",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: On.shorthandCode,
                              onChange: (u) =>
                                Tn((x) => ({
                                  ...x,
                                  shorthandCode: u.target.value,
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. Marg",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className:
                            "space-y-3 pt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850",
                          children: [
                            a.jsxs("label", {
                              className:
                                "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                              children: [
                                a.jsx("input", {
                                  type: "checkbox",
                                  checked: On.printOnReceipt,
                                  onChange: (u) =>
                                    Tn((x) => ({
                                      ...x,
                                      printOnReceipt: u.target.checked,
                                    })),
                                  className:
                                    "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                                }),
                                a.jsx("span", {
                                  children:
                                    "Print Shorthand on Customer Receipt",
                                }),
                              ],
                            }),
                            a.jsxs("label", {
                              className:
                                "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                              children: [
                                a.jsx("input", {
                                  type: "checkbox",
                                  checked: On.printOnTicket,
                                  onChange: (u) =>
                                    Tn((x) => ({
                                      ...x,
                                      printOnTicket: u.target.checked,
                                    })),
                                  className:
                                    "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                                }),
                                a.jsx("span", {
                                  children:
                                    "Print Shorthand on Kitchen Chef Ticket",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: On.isActive,
                              onChange: (u) =>
                                Tn((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", { children: "Active rule" }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => al(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Shorthand" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Kh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: f0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Wa
                            ? "Update Department"
                            : "Create Kitchen Department",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ol(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Department Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: il.name,
                              onChange: (u) =>
                                ul((x) => ({
                                  ...x,
                                  name: u.target.value.toUpperCase(),
                                })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. PIZZA or STARTERS or CURRYS",
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: il.isActive,
                              onChange: (u) =>
                                ul((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", {
                              children: "Active department route",
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => ol(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Department" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          Gh &&
            a.jsx("div", {
              className:
                "fixed inset-0 z-50 bg-black/70 flex justify-end backdrop-blur-sm",
              children: a.jsx("div", {
                className:
                  "w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl relative",
                children: a.jsxs("form", {
                  onSubmit: h0,
                  className: "flex flex-col h-full",
                  children: [
                    a.jsxs("header", {
                      className:
                        "p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20",
                      children: [
                        a.jsx("h3", {
                          className: "font-extrabold text-sm text-slate-100",
                          children: Ka
                            ? "Update Schedule Shift"
                            : "Create Menu Shift Schedule",
                        }),
                        a.jsx("button", {
                          type: "button",
                          onClick: () => cl(!1),
                          className: "text-slate-500 hover:text-slate-300",
                          children: a.jsx(Ot, { className: "w-5 h-5" }),
                        }),
                      ],
                    }),
                    a.jsxs("div", {
                      className: "flex-1 overflow-y-auto p-5 space-y-4",
                      children: [
                        a.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            a.jsx("label", {
                              className:
                                "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                              children: "Shift Name",
                            }),
                            a.jsx("input", {
                              type: "text",
                              required: !0,
                              value: lr.name,
                              onChange: (u) =>
                                ar((x) => ({ ...x, name: u.target.value })),
                              className:
                                "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                              placeholder: "e.g. Breakfast, Dinner hours",
                            }),
                          ],
                        }),
                        a.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "Start Time",
                                }),
                                a.jsx("input", {
                                  type: "text",
                                  required: !0,
                                  value: lr.startTime,
                                  onChange: (u) =>
                                    ar((x) => ({
                                      ...x,
                                      startTime: u.target.value,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  placeholder: "e.g. 08:00",
                                }),
                              ],
                            }),
                            a.jsxs("div", {
                              className: "space-y-1.5",
                              children: [
                                a.jsx("label", {
                                  className:
                                    "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                                  children: "End Time",
                                }),
                                a.jsx("input", {
                                  type: "text",
                                  required: !0,
                                  value: lr.endTime,
                                  onChange: (u) =>
                                    ar((x) => ({
                                      ...x,
                                      endTime: u.target.value,
                                    })),
                                  className:
                                    "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                                  placeholder: "e.g. 11:30",
                                }),
                              ],
                            }),
                          ],
                        }),
                        a.jsxs("label", {
                          className:
                            "flex items-center space-x-2 text-xs text-slate-400 cursor-pointer",
                          children: [
                            a.jsx("input", {
                              type: "checkbox",
                              checked: lr.isActive,
                              onChange: (u) =>
                                ar((x) => ({
                                  ...x,
                                  isActive: u.target.checked,
                                })),
                              className:
                                "rounded text-brand-500 focus:ring-brand-500 bg-slate-900 border-slate-800 w-4 h-4",
                            }),
                            a.jsx("span", {
                              children: "Active shift schedule",
                            }),
                          ],
                        }),
                      ],
                    }),
                    a.jsxs("footer", {
                      className:
                        "p-5 border-t border-slate-800 bg-slate-950 flex justify-end space-x-2 shrink-0",
                      children: [
                        a.jsx("button", {
                          type: "button",
                          onClick: () => cl(!1),
                          className:
                            "px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400",
                          children: "Cancel",
                        }),
                        a.jsxs("button", {
                          type: "submit",
                          className:
                            "px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10",
                          children: [
                            a.jsx($t, { className: "w-4 h-4" }),
                            a.jsx("span", { children: "Save Shift" }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
        ],
      })
    : a.jsxs("div", {
        className:
          "min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-4 relative overflow-hidden",
        children: [
          a.jsx("div", {
            className:
              "absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none",
          }),
          a.jsx("div", {
            className:
              "absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none",
          }),
          a.jsxs("div", {
            className:
              "w-full max-w-sm glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10",
            children: [
              a.jsxs("div", {
                className: "flex items-center space-x-3 mb-6 justify-center",
                children: [
                  a.jsx("div", {
                    className:
                      "w-10 h-10 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center",
                    children: a.jsx(qy, { className: "w-5 h-5 text-white" }),
                  }),
                  a.jsxs("div", {
                    children: [
                      a.jsx("h1", {
                        className: "text-lg font-bold tracking-tight",
                        children: "TakeawayPOS Admin",
                      }),
                      a.jsx("p", {
                        className: "text-[10px] text-slate-400",
                        children: "Enterprise Backoffice Login",
                      }),
                    ],
                  }),
                ],
              }),
              a.jsxs("form", {
                onSubmit: Xh,
                className: "space-y-4",
                children: [
                  a.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      a.jsx("label", {
                        className:
                          "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                        children: "Username",
                      }),
                      a.jsx("input", {
                        type: "text",
                        required: !0,
                        value: n,
                        onChange: (u) => r(u.target.value),
                        className:
                          "w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                        placeholder: "admin",
                      }),
                    ],
                  }),
                  a.jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                      a.jsx("label", {
                        className:
                          "text-[10px] font-bold uppercase tracking-wider text-slate-400",
                        children: "Password",
                      }),
                      a.jsx("input", {
                        type: "password",
                        required: !0,
                        value: s,
                        onChange: (u) => l(u.target.value),
                        className:
                          "w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200",
                        placeholder: "••••••••",
                      }),
                    ],
                  }),
                  a.jsx("button", {
                    type: "submit",
                    className:
                      "w-full bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 cursor-pointer",
                    children: "Sign In to Management",
                  }),
                ],
              }),
              c &&
                a.jsxs("div", {
                  className:
                    "mt-4 flex items-center space-x-2 bg-red-950/40 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs",
                  children: [
                    a.jsx(Rl, { className: "w-4 h-4 shrink-0" }),
                    a.jsx("span", { children: c }),
                  ],
                }),
            ],
          }),
        ],
      });
}
const Jv = new Ty({
  defaultOptions: { queries: { refetchOnWindowFocus: !1, retry: 1 } },
});
To.createRoot(document.getElementById("root")).render(
  a.jsx(sf.StrictMode, {
    children: a.jsx(Ly, {
      client: Jv,
      children: a.jsx(ry, { children: a.jsx(Yv, {}) }),
    }),
  }),
);
