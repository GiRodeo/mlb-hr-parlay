// Glossary / stat key. Static reference explaining every metric in the app —
// what it is, how WE compute it, and how to read it. Server component (no
// interactivity), so it's fast and SEO-friendly.

import type { Metadata } from "next";
import { PageContainer, SectionHeading } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Glossary — HR Parlay Engine",
  description: "Definitions and methodology for every stat and metric in the app.",
};

interface Term {
  term: string;
  short: string;        // one-line definition
  detail?: string;      // how we compute / how to read it
  formula?: string;     // optional formula line
}

interface Section {
  title: string;
  blurb?: string;
  terms: Term[];
}

const SECTIONS: Section[] = [
  {
    title: "Batter power (Statcast)",
    blurb: "Quality-of-contact metrics — the strongest predictors of home-run power.",
    terms: [
      {
        term: "Barrel rate",
        short: "Share of batted balls hit with the ideal exit-velocity + launch-angle combo for extra-base damage.",
        detail:
          "A 'barrel' is Statcast's term for contact in the sweet spot of exit velocity AND launch angle — the zone that historically produces the most home runs and extra-base hits (think ~98+ mph at ~26–30°). Barrel rate = barrels ÷ batted balls. It's the single best contact-quality signal for HR power. League average is ~8.5%; elite sluggers run 15–22%.",
        formula: "barrels ÷ batted-ball events",
      },
      {
        term: "Exit velocity (EV)",
        short: "Average speed of the ball off the bat, in mph.",
        detail:
          "Harder contact carries farther. We use the season average. League average ~89 mph; elite ~93–96 mph. Higher is better for HRs.",
      },
      {
        term: "Launch angle",
        short: "Average vertical angle of the ball off the bat, in degrees.",
        detail:
          "HRs come from a sweet spot around 22–28°. Too low = grounders, too high = pop-ups. We score proximity to the ideal HR window, not raw height.",
      },
      {
        term: "Hard-hit rate",
        short: "Share of batted balls hit 95+ mph.",
        detail: "A complementary power signal to barrel rate. League average ~38%; elite 50%+.",
      },
      {
        term: "xSLG (expected slugging)",
        short: "Slugging percentage the batter 'should' have based on contact quality, stripped of luck.",
        detail:
          "Statcast estimates the expected outcome of each batted ball from its exit velocity/launch angle, independent of defense or ballpark luck. xSLG is often more predictive going forward than actual SLG. League average ~.415.",
      },
    ],
  },
  {
    title: "Pitcher vulnerability",
    blurb: "How prone the opposing starter is to giving up home runs.",
    terms: [
      {
        term: "HR/9",
        short: "Home runs allowed per 9 innings pitched.",
        detail: "Direct measure of how often a pitcher surrenders HRs. Higher = more vulnerable. ~1.1 is average; 1.5+ is HR-prone.",
      },
      {
        term: "xFIP",
        short: "Expected Fielding-Independent Pitching — ERA-like, focused on what a pitcher controls.",
        detail:
          "Built from strikeouts, walks, and a normalized HR rate, ignoring defense and batted-ball luck. Lower is better for the pitcher. We use it as a stable signal of pitcher quality; higher xFIP = better for the hitter.",
      },
      {
        term: "Barrel% allowed",
        short: "Share of batted balls against this pitcher that are barreled.",
        detail: "The flip side of the batter's barrel rate. High barrel% allowed = the pitcher gives up loud, HR-friendly contact.",
      },
    ],
  },
  {
    title: "Environment",
    blurb: "Ballpark and weather factors that amplify or suppress home runs.",
    terms: [
      {
        term: "Park HR index",
        short: "How HR-friendly a ballpark is vs. league average (100 = neutral).",
        detail:
          "Above 100 favors home runs, below 100 suppresses them (Coors ~128, Oracle ~84). We use the index split by batter handedness (a short porch helps one side more). NOTE: current values are realistic estimates, not a live Statcast pull — refreshed seasonally.",
        formula: "100 = league-neutral",
      },
      {
        term: "Wind (out/in)",
        short: "Wind component projected toward or away from center field.",
        detail:
          "We project the forecast wind vector onto the stadium's home-plate→center-field bearing. Blowing out boosts carry; blowing in suppresses it. NOTE: the dashboard weather panel is currently illustrative, not live.",
      },
      {
        term: "Altitude",
        short: "Ballpark elevation — thinner air = more carry.",
        detail: "Mainly matters at Coors Field (~5,200 ft), where the ball carries notably farther.",
      },
    ],
  },
  {
    title: "The scoring model",
    blurb: "How the app turns all of the above into a single number and a probability.",
    terms: [
      {
        term: "Composite score (0–100)",
        short: "The headline rating for a batter's HR likelihood on a given day.",
        detail:
          "Nine features (power, expected output, pitcher vulnerability, recent form, park, platoon, weather, lineup slot, hot/cold streak) are each scored 0–100, then combined as a weighted average. Power and expected output carry the most weight. The 'Why this score' panel on a player page shows each feature's contribution.",
        formula: "Σ (feature subscore × weight),  weights sum to 1.0",
      },
      {
        term: "Avg composite (on a parlay)",
        short: "The simple average of the composite scores of the players in that parlay.",
        detail:
          "A quick gauge of overall parlay quality. A parlay averaging 70 is built from stronger individual bets than one averaging 60. It does NOT account for odds or correlation — it's just the mean of the legs' ratings.",
        formula: "(leg1 composite + leg2 composite + …) ÷ number of legs",
      },
      {
        term: "Confidence (High / Medium / Low)",
        short: "A 0–100 rating used to rank parlays within a leg-count bucket.",
        detail:
          "Blends average composite, the parlay's hit probability, and a balance penalty (it dislikes one elite leg paired with a weak one). Color-coded: green ≥70, amber ≥50, red below. It's a ranking aid, NOT a probability.",
      },
      {
        term: "Implied HR probability",
        short: "The model's estimated chance a batter hits ≥1 HR in the game (0–100%).",
        detail:
          "The composite is mapped through a calibration curve anchored to the league-average per-game HR rate (~6%). This is the number the betting/value layer uses. IMPORTANT: the curve is hand-tuned and not yet validated against real outcomes (see the calibration chart on the Value page).",
      },
    ],
  },
  {
    title: "Betting & odds",
    blurb: "How the Value page judges whether a bet is actually worth making.",
    terms: [
      {
        term: "American odds",
        short: "US sportsbook price format (e.g. +450, −120).",
        detail: "+450 means a 1-unit bet profits 4.5 units. −120 means you risk 1.2 to profit 1. Bigger positive number = bigger underdog = bigger payout.",
      },
      {
        term: "Combined odds (parlay)",
        short: "The total fair payout for a multi-leg parlay if every leg hits.",
        detail:
          "On parlay cards this is the model's FAIR (no-vig) price derived from the combined probability — what the bet 'should' pay, not a sportsbook quote. A longer (bigger +) number means a less likely parlay.",
        formula: "derived from combinedProbability (legs multiplied)",
      },
      {
        term: "Hit probability (parlay)",
        short: "Model chance that ALL legs hit.",
        detail:
          "The legs' individual HR probabilities multiplied together (we cap to one leg per game/team to keep that multiplication roughly fair). A 2-leg of 16% × 18% ≈ 2.9%; 4-leg parlays fall well under 1%.",
        formula: "leg1% × leg2% × … (assumes independence)",
      },
      {
        term: "Implied probability",
        short: "What a sportsbook's odds say the chance is — including the bookmaker's margin.",
        detail: "Convert any price to a probability. Because it includes the 'vig', the two sides of a market sum to more than 100%.",
      },
      {
        term: "De-vig / market probability",
        short: "The book's implied probability with its built-in margin removed.",
        detail:
          "Sportsbooks bake a profit margin ('vig'/'juice') into every line, so raw implied probability overstates the true chance. We remove it (normalizing the two sides) to get the market's honest estimate — the fair number we compare our model against.",
      },
      {
        term: "Edge",
        short: "How much our model probability exceeds the de-vigged market probability.",
        detail: "Positive edge = we think the event is more likely than the fair market line implies. This is where potential value comes from.",
        formula: "model probability − de-vigged market probability",
      },
      {
        term: "EV (expected value)",
        short: "Average profit (or loss) per 1 unit staked at the offered price, using our probability.",
        detail:
          "The bottom-line betting metric. Positive EV = a bet worth making over the long run; negative = a losing bet even if it sometimes wins. A +8% EV means you'd expect to profit 8 cents per dollar staked on average.",
        formula: "p × (decimal odds − 1) − (1 − p)",
      },
      {
        term: "Kelly stake",
        short: "Suggested bet size, scaled to the size of your edge.",
        detail:
          "The Kelly criterion sizes bets by edge to maximize long-run growth. We use QUARTER-Kelly (¼ of the full amount) to cut volatility and guard against model error, capped at 5% of bankroll, on a 100-unit base. A bet with no positive edge gets a stake of 0 — we never bet into a negative edge.",
        formula: "¼ × (b·p − q) ÷ b,  capped at 5% bankroll",
      },
    ],
  },
  {
    title: "Performance tracking",
    blurb: "How the History page measures whether the picks actually work.",
    terms: [
      {
        term: "Win rate",
        short: "Share of settled parlays that hit.",
        detail: "Computed over parlays with a known outcome (excludes pending). Multi-leg HR parlays naturally have low win rates.",
      },
      {
        term: "ROI",
        short: "Return on investment per unit staked across settled bets.",
        detail:
          "Assumes a flat 1-unit stake per parlay; winners pay their fair odds. Negative ROI is common for HR parlays — a sobering but honest signal.",
      },
      {
        term: "CLV (closing line value)",
        short: "Whether you beat the line's final price before game time. [Planned]",
        detail:
          "The best predictor of true betting skill — not yet built. If you consistently bet better numbers than the closing line, you're a long-term winner regardless of short-term results.",
      },
      {
        term: "Calibration (ECE / Brier)",
        short: "Whether the model's probabilities match reality.",
        detail:
          "If the model says '12%' should the event happen ~12% of the time? ECE (expected calibration error) and the Brier score measure this. Currently shown on sample data — real calibration needs an accumulated prediction log.",
      },
      {
        term: "Units",
        short: "A bankroll-relative bet size, independent of dollar amount.",
        detail:
          "Pros track in units, not dollars, so strategy is comparable across bankroll sizes. The Bankroll tracker starts at 100 units; a '2u' bet risks 2% of the starting bankroll.",
      },
      {
        term: "Max drawdown",
        short: "The largest peak-to-trough drop in your bankroll.",
        detail:
          "Measures the worst losing stretch you'd have endured. Even profitable strategies have drawdowns — knowing yours helps size bets so a bad run doesn't wipe you out. A drawdown over ~25% is a warning sign your stakes are too large.",
        formula: "max over time of (peak − bankroll) ÷ peak",
      },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Glossary & Stat Key"
        subtitle="What every metric means, how we compute it, and how to read it"
      />

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-3">
              <h2 className="text-lg font-bold tracking-tight">{section.title}</h2>
              {section.blurb && <p className="text-sm text-muted-foreground">{section.blurb}</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {section.terms.map((t) => (
                <Card key={t.term}>
                  <CardHeader className="pb-1.5">
                    <CardTitle className="text-base">{t.term}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <p className="text-sm">{t.short}</p>
                    {t.formula && (
                      <p className="stat-figure rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {t.formula}
                      </p>
                    )}
                    {t.detail && <p className="text-xs leading-relaxed text-muted-foreground">{t.detail}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Card className="mt-8 border-confidence-med/30 bg-confidence-med/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Badge variant="med-soft">Note</Badge>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Several inputs are honest approximations, clearly flagged where they appear: park factors
            are seasonal estimates (not a live Statcast pull), the dashboard weather panel is
            illustrative, and model calibration currently uses sample data. The probability model is
            hand-tuned and not yet validated against accumulated outcomes — treat all probabilities and
            EV figures as informed estimates, not guarantees. No model beats the market by default.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
