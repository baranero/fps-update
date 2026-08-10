import type { KbContent } from "../../types";

// English translation of ./pl.ts. The Polish version leads — when the article
// is revised, update pl.ts first and mirror the change here.
export const en: KbContent = {
  title: "How many cells do you actually need? The characteristic fire diameter D* in practice",
  lead:
    "Mesh resolution in FDS is set against the fire, not against the architectural drawing. Here is how to compute D*, turn it into a cell size and defend the choice in review — without burning core-hours for nothing.",
  tags: ["Mesh", "D*", "FDS", "Compute cost"],
  blocks: [
    {
      type: "p",
      text:
        "The most common question at the start of an FDS project is “what mesh should I use?”, and the most common answer is “10 centimetres, that is what people do”. The trouble is that 10 cm is an excellent mesh for a 1 MW fire in a warehouse and a pointless one for a 10 MW fire in a car park, or for a 200 kW flame in a hotel room. Resolution in FDS is not a property of the building — it is a property of the **fire** you burn inside it.",
    },
    {
      type: "p",
      text:
        "The measure that sorts this out is the characteristic fire diameter, D*. Below: where it comes from, how to turn it into `IJK` in the `&MESH` namelist, where it stops being sufficient, and what each refinement really costs.",
    },

    { type: "h", n: "01", text: "Resolving the fire, not the geometry" },
    {
      type: "p",
      text:
        "FDS solves fire as a large eddy simulation (LES): large flow structures are resolved directly, small ones are modelled. For the result to mean anything, the mesh has to resolve the plume structure — the combustion region, air entrainment and flame pulsation. If the whole flame fits into three cells, the solver has nothing to describe mixing with: temperature, velocity and soot production then come out of the sub-grid model rather than out of physics.",
    },
    {
      type: "p",
      text:
        "Hence the resolution criterion: what matters is not the cell size δx on its own but the ratio D*/δx — **how many cells the characteristic size of the fire is spread across**. The same 10 cm mesh gives D*/δx ≈ 10 for 1 MW and ≈ 24 for 10 MW: a solid working standard in the first case, and in the second an excess you pay for in compute time.",
    },

    { type: "h", n: "02", text: "The formula and what sits inside it" },
    {
      type: "code",
      caption: "Characteristic fire diameter — the definition from the FDS documentation",
      text: `D* = [ Q / (rho_inf * c_p * T_inf * sqrt(g)) ] ^ (2/5)

Q       [kW]          design fire heat release rate (HRR)
rho_inf = 1.204 kg/m3 ambient air density
c_p     = 1.005 kJ/(kg*K) specific heat of air
T_inf   = 293 K       ambient temperature
g       = 9.81 m/s2   gravitational acceleration

at normal conditions the denominator = 1110  ->  D* = (Q / 1110) ^ 0.4`,
    },
    {
      type: "p",
      text:
        "At normal conditions the denominator is constant at about 1110, so in practice you compute `D* = (Q̇ / 1110)^0.4` with Q̇ in kilowatts. Everything else comes down to choosing one number: the design fire heat release rate.",
    },
    {
      type: "note",
      title: "Which heat release rate to use",
      text:
        "The formula takes the **design (peak)** heat release rate of the scenario, not the instantaneous one. With a t² curve the early growth phase will always be less well resolved than the developed phase — and that is fine, because evacuation criteria are checked once the fire has developed. If the scenario has several fire sources of different size, compute D* for each and size the mesh to the smallest.",
    },

    { type: "h", n: "03", text: "What the numbers look like" },
    {
      type: "p",
      text:
        "The FDS documentation (User's Guide and Validation Guide) works with D*/δx values from 4 (coarse, exploratory) to 16 (fine, research grade). A practical starting point for design work sits around 10 — here is δx for three resolution levels:",
    },
    {
      type: "table",
      caption: "Cell size δx [m] for typical design fire heat release rates",
      head: ["Fire HRR Q̇", "D* [m]", "D*/δx = 4 (coarse)", "D*/δx = 10 (standard)", "D*/δx = 16 (fine)"],
      rows: [
        ["1 MW", "0.96", "0.24", "0.096", "0.060"],
        ["2.5 MW", "1.38", "0.35", "0.138", "0.086"],
        ["5 MW", "1.83", "0.46", "0.183", "0.114"],
        ["10 MW", "2.41", "0.60", "0.241", "0.151"],
      ],
    },
    {
      type: "p",
      text:
        "One thing here surprises people: a 10 MW fire does not need a finer mesh than a 1 MW fire — it needs a **coarser** one. A stronger fire is physically larger, so its structure fits into fewer, bigger cells. What really forces refinement is small fire sources and narrow geometry, not megawatts.",
    },

    { type: "h", n: "04", text: "From δx to IJK: two rules when writing &MESH" },
    {
      type: "p",
      text:
        "The cell size from the table is a target, not an order. Put it through two filters before it reaches the input file.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "**The geometry has to divide by δx.** Cell faces should line up with walls, slabs and the edges of openings. FDS snaps geometry to the mesh anyway (`OBST` grows or disappears), so it is better to round δx to a value that divides your storey dimensions than to explain later where a wall 4 cm thicker came from.",
        "**Cell counts should factor into 2, 3 and 5.** The Poisson solver in FDS uses a fast transform and works efficiently when every number in `IJK` has the form 2^l · 3^m · 5^n. A prime in `IJK` (say 61) can slow the run noticeably for zero gain in accuracy.",
        "**Keep cells as cubic as you can.** Stretching a cell along one axis degrades the plume; an aspect ratio beyond roughly 2:1 should be a deliberate compromise, not a default.",
      ],
    },
    {
      type: "code",
      caption: "A 6.0 × 4.8 × 3.6 m room, 1 MW fire, δx = 0.10 m (D*/δx ≈ 10)",
      text: `&MESH IJK=60,48,36, XB=0.0,6.0, 0.0,4.8, 0.0,3.6 /

! 60 = 2^2 · 3 · 5      6.0 / 60 = 0.10 m
! 48 = 2^4 · 3          4.8 / 48 = 0.10 m
! 36 = 2^2 · 3^2        3.6 / 36 = 0.10 m
! 103,680 cells in total, cubic cells`,
    },
    {
      type: "p",
      text:
        "Splitting the model across several meshes (parallel MPI runs) adds a third rule: meshes must meet cell to cell. Put the boundary where the flow is calm — it should not cut through the plume, a supply jet or a smoke vent.",
    },
    {
      type: "code",
      caption: "Two conforming meshes — the boundary sits away from the fire",
      text: `&MESH ID='M1', IJK=60,48,36, XB= 0.0, 6.0, 0.0,4.8, 0.0,3.6 /
&MESH ID='M2', IJK=60,48,36, XB= 6.0,12.0, 0.0,4.8, 0.0,3.6 /`,
    },

    { type: "h", n: "05", text: "What D* does not cover" },
    {
      type: "p",
      text:
        "The D* criterion is about the fire. Models contain elements whose characteristic size can be smaller than the plume — and then it is those, not the fire source, that set the mesh:",
    },
    {
      type: "list",
      items: [
        "openings and gaps (a door left ajar, grilles, constrictions) — the opening itself needs several cells, otherwise the flow through it is fiction;",
        "high-velocity supply jets and air curtains — the jet has to be resolved so it does not smear out in the first cell;",
        "the near-wall layer when measuring surface temperatures (`BNDF`) and for buoyancy-driven smoke exhaust under the ceiling;",
        "thin partitions and glazing — an object thinner than a cell will be rounded up to the cell size anyway.",
      ],
    },
    {
      type: "note",
      title: "A warning sign",
      text:
        "If the result jumps after a minor geometry tweak (moving a wall by half a cell, changing an opening height by 5 cm), that is usually not physics — it is a sign the mesh is too coarse for what it is meant to describe.",
    },

    { type: "h", n: "06", text: "Grid sensitivity study — what a reviewer expects" },
    {
      type: "p",
      text:
        "The D*/δx value on its own is not proof of correctness — it is a starting point. The argument that holds up in review is showing that the result stopped depending on the mesh. The minimum honest scope of such a study:",
    },
    {
      type: "list",
      items: [
        "run the scenario on the target mesh and on a refined one (typically δx and 0.5·δx in the fire region);",
        "compare the quantities your assessment rests on — visibility at 1.8 m, temperature in the evacuation plane, smoke layer height — not the “general look of the smoke” in Smokeview;",
        "document the difference numerically and state whether it changes compliance with the criterion: a few per cent with margin to the threshold is an argument, 30% on a borderline result is not;",
        "record the adopted D*, δx and the resulting D*/δx in the report, along with the cell count of each mesh.",
      ],
    },

    { type: "h", n: "07", text: "The price of resolution: why “twice as fine” costs ~16× more" },
    {
      type: "p",
      text:
        "Halving the cell size gives eight times as many cells (three dimensions). On top of that the CFL stability condition ties the time step to the cell size, so a smaller cell forces roughly twice as many time steps for the same second of simulated time. Together: **about a sixteenfold increase in compute cost** per refinement level.",
    },
    {
      type: "table",
      caption: "The same model at two resolution levels",
      head: ["Variant", "δx", "Cell count", "Relative cost"],
      rows: [
        ["Target", "0.10 m", "103,680", "1×"],
        ["Refined", "0.05 m", "829,440", "≈ 16×"],
      ],
    },
    {
      type: "p",
      text:
        "That is why refining “just in case” across the whole domain is the most expensive way of buying peace of mind. The cheaper and better-defended strategy is a mesh sized to D* throughout the model, with local refinement exactly where the result is decided: above the fire, in openings and around the measurement points.",
    },
    {
      type: "cta",
      text: "Got a .fds file and want to know how long it will take and what it will cost at this mesh?",
      linkText: "Check it in the estimator",
      href: "/symulacje/nowa",
    },
  ],
};
