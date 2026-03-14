# FinGuard-AI
Your finances, gamified — spend smart, earn XP, level up to Financial Overlord

# FinGuard-AI
Your finances, gamified — spend smart, earn XP, level up to Financial Overlord

## Inspiration
I've always found personal finance *boring to track and terrifying to face.*
Most finance apps throw charts and red numbers at you — and you close the tab.

I wanted to flip that. What if your **bank statement felt like a game?**
What if bad spending habits gave you a warning like a low-HP character, and
good savings streaks made you level up? That's the spark behind FinGuard.

## What it does
FinGuard is basically a financial report card — but make it a video game.
You paste in your bank transactions, and it tells you three things:

How badly are you spending? It scans every rupee and flags danger zones — like "you're spending 40% of your income on food and EMIs, that's risky."
Should you invest in crypto? Based on your financial health, it tells you if you're ready for crypto or if you should fix your finances first.
What's your player level? Instead of just showing boring charts, it gives you an XP score, a level title (like Wealth Wizard or Broke Beginner), and badges you unlock by having good money habits.

The AI then writes you a personalised report — like a financial advisor in your pocket — telling you exactly where your money is going and how to save more.
In one line: it turns your bank statement into a game, so you actually want to fix your finances.

## How we built it
The Backend 
I built a Python server using FastAPI. When you submit your transactions, it runs a risk scoring algorithm that checks things like — are you spending more than 90% of your income? Are you blowing money on dining or loans? It calculates a score from 0–100.
Then it sends all that data to Groq's AI (running LLaMA 3.3 70B) which writes the actual human-readable financial report and savings plan in under a second.

The Frontend 
Built entirely in React, with zero UI libraries. Every button, card, glow effect, and animation is written in CSS. I went for a cyberpunk RPG aesthetic — dark background, neon colors, Orbitron font — to make it feel like a game, not a spreadsheet.

The Gamification layer 
On top of the risk score, I wrote a custom XP formula that rewards good habits — low spending, high savings rate, tracking more transactions. That XP maps to 10 player levels, unlocks badges, and drives the avatar character you see on screen.

The Crypto layer
Plugged into the CoinGecko API for live prices, and built a recommender that looks at your risk score and tells you exactly how much (if any) of your savings should go into Bitcoin, Ethereum, or Solana.

Everything talks to each other — your transactions go in, the AI thinks, the game engine reacts, and your financial character either levels up or gets a skull. 💀

## Challenges we ran into
The hardest part wasn't the code — it was the design philosophy.

Gamification can feel gimmicky. Making XP and levels feel earned rather than
arbitrary required careful calibration of the scoring weights. A user with a 30%
savings rate should feel like a Level 7 — not a Level 2.

Other challenges:
- CSV parsing across bank formats — every Indian bank exports differently.
  Building a fuzzy header matcher that handles HDFC, SBI, and Axis formats
  without configuration was tricky.
- Prompt reliability — early versions of the LLM prompt would sometimes
  merge both report sections. Solved with explicit delimiter tokens and
  post-processing splits.

## Accomplishments that we're proud of
Making financing fun.
That's genuinely hard. Most fintech apps are anxiety machines. We built something people want to open — because it feels like a game, not a lecture.
AI report in under a second.
Getting LLaMA 3.3 70B via Groq to reliably output a structured, personalised financial report with clean section splits and real rupee numbers.
The XP formula actually makes sense.
Didn't just slap random points on things. The XP system is mathematically tied to real financial health metrics — savings rate, risk score, transaction discipline. Level 7 means something.

## What we learned
- How to design a gamification loop that actually maps to real financial behaviour
- Prompt engineering for structured AI output — getting the LLM to reliably
  return two labelled sections every time
- Building a neon RPG UI using CSS variables.
- How surprisingly well LLaMA 3.3 70B via Groq performs on financial analysis
  when given a tight, data-rich prompt

## What's next for FinGuard AI
- Persistent XP across sessions (local storage / user auth)
- Real streak tracking from multi-month CSV history
- A leaderboard — because competition is the best financial motivator
