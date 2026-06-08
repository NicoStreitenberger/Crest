import streamlit as st
import requests
import pandas as pd
import os

# Set page configuration with a premium dark theme feel
st.set_page_config(
    page_title="CREST Studio — Command Center",
    page_icon="◼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Dark styling injections
st.markdown("""
    <style>
    .main {
        background-color: #000000;
        color: #ffffff;
    }
    div[data-testid="stMetricValue"] {
        font-size: 2.5rem;
        font-weight: 700;
        color: #ffffff;
    }
    div[data-testid="stMetricLabel"] {
        color: #a3a3a3;
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.1em;
    }
    h1, h2, h3 {
        font-family: 'Inter', sans-serif !important;
        text-transform: uppercase;
        letter-spacing: -0.02em;
    }
    </style>
    """, unsafe_allow_html=True)

# Supabase Credentials Loader (loads from environment or falls back to defaults)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://vojwdyubksoozhyvnbfu.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvandkeXVia3Nvb3poeXZuYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU1OTcsImV4cCI6MjA5NDAxMTU5N30.8uUc1skFlGTViyaIx_JVrEwYDO6uKg6DNvaD5BfYuW0")

# Read credentials from local .env if available and not set in env
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("SUPABASE_URL="):
                SUPABASE_URL = line.split("=")[1].strip()
            elif line.startswith("SUPABASE_ANON_KEY="):
                SUPABASE_ANON_KEY = line.split("=")[1].strip()

# REST Headers setup
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

# Fetch Data Helper
@st.cache_data(ttl=15)
def fetch_supabase_table(table_name):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return pd.DataFrame(response.json())
        else:
            st.sidebar.error(f"Error fetching {table_name}: HTTP {response.status_code}")
            return pd.DataFrame()
    except Exception as e:
        st.sidebar.error(f"Connection error: {e}")
        return pd.DataFrame()

# Sidebar Setup
st.sidebar.title("CREST | OS")
st.sidebar.markdown("---")
st.sidebar.markdown("### Backend Status")
st.sidebar.success("Supabase Link Active")

# Reload trigger
if st.sidebar.button("Force Sync Data ⟳"):
    st.cache_data.clear()

st.sidebar.markdown("---")
st.sidebar.info("Executive command dashboard for tracking conversion optimization (CRO) metrics, leads budget queues, and drop-off analysis.")

# Fetching tables
leads_df = fetch_supabase_table("enlist_applications")
events_df = fetch_supabase_table("analytics_events")

# MAIN PAGE HEADER
st.title("CREST Studio — Command Center")
st.markdown("`ESTADO DE OPERACIONES Y TELEMETRÍA CRO` — *Málaga, España*")
st.markdown("---")

# DATA CALCULATIONS
total_visits = 0
form_initiations = 0
form_successes = 0
form_abandonments = 0
abandoned_fields = pd.DataFrame()

if not events_df.empty:
    total_visits = len(events_df[events_df['event_name'] == 'page_view'])
    form_initiations = len(events_df[events_df['event_name'] == 'Enlist_Form_Initiated'])
    form_successes = len(events_df[events_df['event_name'] == 'Enlist_Form_Success'])
    form_abandonments = len(events_df[events_df['event_name'] == 'Enlist_Form_Abandoned'])
    
    # Extract drop-off field metadata
    abandoned_events = events_df[events_df['event_name'] == 'Enlist_Form_Abandoned']
    if not abandoned_events.empty:
        fields = []
        for meta in abandoned_events['metadata']:
            if isinstance(meta, dict) and 'last_field' in meta:
                fields.append(meta['last_field'])
        if fields:
            abandoned_fields = pd.DataFrame(fields, columns=["Field"]).value_counts().reset_index(name="Count")

# Budget parser to compute potential revenue backlog
potential_revenue = 0.0
if not leads_df.empty:
    # Estimate minimum values for each budget range tier
    budget_map = {
        "5K - 10K": 5000,
        "10K - 25K": 10000,
        "+25K": 25000
    }
    
    # Filter pending leads to calculate backlog under review
    pending_leads = leads_df[leads_df['status'] == 'PENDING_REVIEW']
    for val in pending_leads['budget_range']:
        potential_revenue += budget_map.get(val, 0)

# Calculate global conversion rate
conversion_rate = 0.0
if total_visits > 0:
    conversion_rate = (form_successes / total_visits) * 100

# TOP METRICS CARD ROW
m1, m2, m3, m4 = st.columns(4)

with m1:
    st.metric(
        label="Potential Revenue Backlog", 
        value=f"${potential_revenue:,.0f}", 
        help="Estimated minimum revenue sum of all leads currently in PENDING_REVIEW status"
    )

with m2:
    st.metric(
        label="Global Conversion Rate (CRO)", 
        value=f"{conversion_rate:.2f}%", 
        help="Calculated as (Enlist_Form_Success / Total_Page_Views) * 100"
    )

with m3:
    st.metric(
        label="Total Enlists Recieved", 
        value=f"{len(leads_df)}" if not leads_df.empty else "0"
    )

with m4:
    st.metric(
        label="Total Site Visits", 
        value=f"{total_visits}"
    )

st.markdown("---")

# GRAPHS ROW
g1, g2 = st.columns(2)

with g1:
    st.subheader("Discipline Demand Trends")
    if not leads_df.empty and 'discipline_needed' in leads_df.columns:
        discipline_counts = leads_df['discipline_needed'].value_counts().reset_index(name="Applications")
        discipline_counts.columns = ["Discipline", "Applications"]
        
        # Display as a horizontal bar chart
        st.bar_chart(
            data=discipline_counts, 
            x="Discipline", 
            y="Applications", 
            use_container_width=True
        )
    else:
        st.info("No applications logged in the database yet.")

with g2:
    st.subheader("CRO Funnel Telemetry")
    funnel_data = pd.DataFrame({
        "Funnel Stage": ["Visits (Page Views)", "Form Initiated", "Form Completed (Success)", "Form Abandoned"],
        "Count": [total_visits, form_initiations, form_successes, form_abandonments]
    })
    st.bar_chart(
        data=funnel_data, 
        x="Funnel Stage", 
        y="Count", 
        use_container_width=True
    )

st.markdown("---")

# DETAILED BRIEFING ABANDONMENT ANALYSIS
st.subheader("Briefing Form Abandonment Field Analysis")
if not abandoned_fields.empty:
    st.markdown("Below is the frequency mapping of the last focused input field recorded before page abandonment (unloads/visibility changes):")
    st.bar_chart(
        data=abandoned_fields,
        x="Field",
        y="Count",
        use_container_width=True
    )
else:
    st.info("No abandonment events recorded in the telemetry tables yet.")

st.markdown("---")

# PENDING LEADS TABLE
st.subheader("Queue: Leads Pending Review")
if not leads_df.empty:
    pending_table = leads_df[leads_df['status'] == 'PENDING_REVIEW'][['created_at', 'brand_name', 'client_email', 'discipline_needed', 'budget_range']]
    if not pending_table.empty:
        pending_table.columns = ["Date Received", "Brand Name", "Contact Email", "Discipline Needed", "Budget Range"]
        st.dataframe(pending_table, use_container_width=True)
    else:
        st.success("All received briefs have been reviewed. Queue is empty.")
else:
    st.info("No enlist applications received yet.")
