from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
import os
import json

app = FastAPI(title="FinGuard AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class Transaction(BaseModel):
    date: str
    description: str
    category: str
    amount: float

class AnalysisRequest(BaseModel):
    transactions: List[Transaction]
    monthly_income: float
    savings_goal: Optional[float] = None

class RiskFlag(BaseModel):
    category: str
    severity: str
    message: str
    amount: float

class AnalysisResponse(BaseModel):
    risk_score: int
    risk_level: str
    total_spent: float
    total_income: float
    savings_rate: float
    top_categories: dict
    risk_flags: List[RiskFlag]
    ai_report: str
    savings_plan: str

def compute_stats(transactions, monthly_income):
    total_spent = sum(-t.amount for t in transactions if t.amount < 0)
    total_income = sum(t.amount for t in transactions if t.amount > 0) or monthly_income
    category_totals = {}
    for t in transactions:
        if t.amount < 0:
            category_totals[t.category] = category_totals.get(t.category, 0) + abs(t.amount)
    sorted_cats = dict(sorted(category_totals.items(), key=lambda x: x[1], reverse=True))
    savings_rate = max(0, (total_income - total_spent) / total_income * 100)
    risk_score = 0
    flags = []
    spend_ratio = total_spent / total_income
    if spend_ratio > 0.9:
        risk_score += 40
        flags.append(RiskFlag(category="Overall Spending", severity="high",
            message=f"Spending {spend_ratio*100:.1f}% of income — dangerously close to 100%", amount=total_spent))
    elif spend_ratio > 0.75:
        risk_score += 20
        flags.append(RiskFlag(category="Overall Spending", severity="medium",
            message=f"Spending {spend_ratio*100:.1f}% of income — leaving little buffer", amount=total_spent))
    for cat, amt in sorted_cats.items():
        cat_ratio = amt / total_income
        if cat.lower() in ["dining", "food", "restaurants", "entertainment"] and cat_ratio > 0.2:
            risk_score += 15
            flags.append(RiskFlag(category=cat, severity="medium",
                message=f"High discretionary spend on {cat}: ₹{amt:,.0f}", amount=amt))
        if cat.lower() in ["gambling", "betting", "loans", "emi"] and cat_ratio > 0.3:
            risk_score += 25
            flags.append(RiskFlag(category=cat, severity="high",
                message=f"Risky category: {cat} consuming {cat_ratio*100:.1f}% of income", amount=amt))
    if savings_rate < 10:
        risk_score += 20
        flags.append(RiskFlag(category="Savings", severity="high",
            message=f"Savings rate is only {savings_rate:.1f}% — experts recommend 20%+", amount=0))
    risk_score = min(risk_score, 100)
    if risk_score < 25:   risk_level = "Safe"
    elif risk_score < 50: risk_level = "Moderate"
    elif risk_score < 75: risk_level = "Risky"
    else:                 risk_level = "Critical"
    return {
        "total_spent": total_spent,
        "total_income": total_income,
        "savings_rate": savings_rate,
        "top_categories": sorted_cats,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_flags": flags,
    }

def build_prompt(stats, transactions, savings_goal):
    tx_summary = "\n".join(
        f"  {t.date} | {t.category:20s} | {t.description:30s} | ₹{t.amount:,.2f}"
        for t in transactions[:30]
    )
    goal_line = f"User's monthly savings goal: ₹{savings_goal:,.0f}" if savings_goal else "No specific savings goal set."
    return f"""
You are FinGuard AI, an expert personal finance analyst. Analyze this user's financial data.

=== FINANCIAL SUMMARY ===
Monthly Income:  ₹{stats['total_income']:,.2f}
Total Spent:     ₹{stats['total_spent']:,.2f}
Savings Rate:    {stats['savings_rate']:.1f}%
Risk Score:      {stats['risk_score']}/100 ({stats['risk_level']})
{goal_line}

Top Spending Categories:
{json.dumps(stats['top_categories'], indent=2)}

Recent Transactions:
{tx_summary}

Write TWO clearly labelled sections:

**[FINANCIAL HEALTH REPORT]**
4-5 sentences analysing spending patterns, identifying biggest risks, highlighting positive habits. Be specific with numbers.

**[PERSONALISED SAVINGS PLAN]**
A concrete 3-step monthly savings plan with specific rupee targets. Include one quick win the user can act on today.
"""

@app.get("/")
def root():
    return {"message": "FinGuard AI is running 🚀"}

@app.post("/analyze", response_model=AnalysisResponse)
def analyze(req: AnalysisRequest):
    if not req.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided")
    stats = compute_stats(req.transactions, req.monthly_income)
    prompt = build_prompt(stats, req.transactions, req.savings_goal)
    message = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    full_text = message.choices[0].message.content
    report, savings_plan = full_text, ""
    if "[PERSONALISED SAVINGS PLAN]" in full_text:
        parts = full_text.split("[PERSONALISED SAVINGS PLAN]")
        report = parts[0].replace("[FINANCIAL HEALTH REPORT]", "").strip()
        savings_plan = parts[1].strip()
    elif "[FINANCIAL HEALTH REPORT]" in full_text:
        report = full_text.replace("[FINANCIAL HEALTH REPORT]", "").strip()
    return AnalysisResponse(
        risk_score=stats["risk_score"],
        risk_level=stats["risk_level"],
        total_spent=stats["total_spent"],
        total_income=stats["total_income"],
        savings_rate=stats["savings_rate"],
        top_categories=stats["top_categories"],
        risk_flags=stats["risk_flags"],
        ai_report=report,
        savings_plan=savings_plan,
    )

@app.get("/sample-data")
def sample_data():
    return {
        "monthly_income": 75000,
        "savings_goal": 15000,
        "transactions": [
            {"date": "2024-01-01", "description": "Salary Credit",       "category": "Income",        "amount":  75000},
            {"date": "2024-01-02", "description": "Rent Payment",        "category": "Housing",       "amount": -22000},
            {"date": "2024-01-03", "description": "Zomato Order",        "category": "Dining",        "amount":  -850},
            {"date": "2024-01-04", "description": "Swiggy Order",        "category": "Dining",        "amount":  -620},
            {"date": "2024-01-05", "description": "Grocery - BigBasket", "category": "Groceries",     "amount": -3200},
            {"date": "2024-01-06", "description": "Netflix Subscription","category": "Entertainment", "amount":  -649},
            {"date": "2024-01-07", "description": "Uber Ride",           "category": "Transport",     "amount":  -380},
            {"date": "2024-01-08", "description": "Amazon Purchase",     "category": "Shopping",      "amount": -2400},
            {"date": "2024-01-09", "description": "Gym Membership",      "category": "Health",        "amount": -1500},
            {"date": "2024-01-10", "description": "Restaurant Dinner",   "category": "Dining",        "amount": -1800},
            {"date": "2024-01-11", "description": "Electricity Bill",    "category": "Utilities",     "amount": -1200},
            {"date": "2024-01-12", "description": "Mobile Recharge",     "category": "Utilities",     "amount":  -599},
            {"date": "2024-01-13", "description": "Movie Tickets",       "category": "Entertainment", "amount":  -700},
            {"date": "2024-01-14", "description": "Coffee Shop",         "category": "Dining",        "amount":  -340},
            {"date": "2024-01-15", "description": "Petrol",              "category": "Transport",     "amount":  -900},
            {"date": "2024-01-16", "description": "Clothing Purchase",   "category": "Shopping",      "amount": -3500},
            {"date": "2024-01-17", "description": "Doctor Visit",        "category": "Health",        "amount":  -800},
            {"date": "2024-01-18", "description": "Online Course",       "category": "Education",     "amount": -1999},
            {"date": "2024-01-19", "description": "Weekend Trip",        "category": "Travel",        "amount": -5500},
            {"date": "2024-01-20", "description": "Bar Tab",             "category": "Entertainment", "amount": -1200},
            {"date": "2024-01-21", "description": "Freelance Income",    "category": "Income",        "amount":  8000},
            {"date": "2024-01-22", "description": "Grocery Top-up",      "category": "Groceries",     "amount":  -890},
            {"date": "2024-01-23", "description": "Ola Cab",             "category": "Transport",     "amount":  -450},
            {"date": "2024-01-24", "description": "Spotify Premium",     "category": "Entertainment", "amount":  -119},
            {"date": "2024-01-25", "description": "Personal Loan EMI",   "category": "Loans",         "amount": -5000},
        ]
    }