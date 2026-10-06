"""Section 45X rules used to compute the expected results for the Volterra synthetic dataset.

Operational data and tax rules are kept separate: this module contains ONLY rules,
each with a citation to the regulatory documents under docs/compliance/ in this repo.
Nothing here is tax advice. Where a rule is uncertain or not available in the source
documents, it is listed in UNRESOLVED_RULES and is NOT used to compute any number.
"""

from __future__ import annotations

TAX_YEAR = 2026

# --------------------------------------------------------------------------------------
# Applied rules (each used in expected-results arithmetic)
# --------------------------------------------------------------------------------------

RULES = {
    "BATTERY_CELL_RATE_PER_KWH": {
        "value": 35.00,
        "unit": "USD per kWh of capacity",
        "citation": "Form 7207 (Rev. December 2025), Part II, line 5a, column (c): 'Battery cell ... kilowatt-hour basis $ 35.00' "
        "(docs/compliance/f7207.pdf, page 1).",
    },
    "BATTERY_CELL_MIN_ENERGY_DENSITY_WH_PER_L": {
        "value": 100.0,
        "unit": "Wh/L",
        "citation": "Instructions for Form 7207 (Rev. December 2025), Line 5a: 'an energy density of not less than 100 watt-hours per liter' "
        "(docs/compliance/i7207--2025.pdf, page 5).",
    },
    "BATTERY_CELL_MIN_ENERGY_WH": {
        "value": 12.0,
        "unit": "Wh",
        "citation": "Instructions for Form 7207, Line 5a: 'capable of storing at least 12 watt-hours of energy' "
        "(docs/compliance/i7207--2025.pdf, page 5).",
    },
    "BATTERY_CELL_MAX_CAPACITY_TO_POWER_RATIO": {
        "value": 100.0,
        "unit": "ratio (capacity : maximum discharge)",
        "citation": "Instructions for Form 7207, Line 5a: 'the capacity must not exceed a capacity-to-power ratio not exceeding 100:1' "
        "(docs/compliance/i7207--2025.pdf, page 5).",
    },
    "CAPACITY_KWH_BASIS": {
        "value": "units_sold x kWh_per_unit",
        "unit": "kWh",
        "citation": "Instructions for Form 7207, Column (d) for lines 5a-5c: aggregate capacity is 'the number of eligible components "
        "produced and sold by the capacity of each component expressed on a kilowatt-hour basis' (docs/compliance/i7207--2025.pdf, page 5).",
    },
    "PHASE_OUT_FACTOR": {
        "value": {2026: 1.00},
        "unit": "fraction of normal credit, by calendar year of sale",
        "citation": "Instructions for Form 7207, 'Phase out and termination': the credit phases out for eligible components sold after 2029 "
        "(docs/compliance/i7207--2025.pdf, page 3). 2026 sales therefore use 100%.",
    },
    "QUALIFIED_SALE": {
        "value": "produced in the United States and sold to an unrelated person during the tax year",
        "unit": None,
        "citation": "Instructions for Form 7207, Special Rules - Qualified sales (docs/compliance/i7207--2025.pdf, page 2).",
    },
}

# --------------------------------------------------------------------------------------
# Assumptions (documented, applied)
# --------------------------------------------------------------------------------------

ASSUMPTIONS = [
    {
        "id": "A1",
        "assumption": "kWh per cell = nominal voltage (V) x rated capacity (Ah) / 1000, using the rated capacity declared in the "
        "qualification report.",
        "why": "The Form 7207 instructions express capacity on a kWh basis but the source documents in docs/compliance/ do not "
        "specify which test value (rated vs. measured mean) to use. Rated capacity is the conservative, conventional basis.",
    },
    {
        "id": "A2",
        "assumption": "Only sales invoiced in calendar 2026 count toward the 2026 credit; all 2026 sales are of cells produced in 2026.",
        "why": "Production starts in 2026 and there is no opening inventory, so no cross-year production/sale timing question arises.",
    },
    {
        "id": "A3",
        "assumption": "Volterra claims credits only for battery cells. Electrode active materials and other inputs are purchased "
        "from suppliers and are not claimed by Volterra.",
        "why": "Dataset scope (per design approval).",
    },
]

# --------------------------------------------------------------------------------------
# Rules NOT applied (uncertain or not available in docs/compliance/) - never used in arithmetic
# --------------------------------------------------------------------------------------

UNRESOLVED_RULES = [
    {
        "id": "U1",
        "topic": "Material assistance from prohibited foreign entities (material assistance cost ratio)",
        "status": "NOT COMPUTED - requires professional review",
        "why": "The Form 7207 instructions state that eligible components may not include material assistance from a prohibited "
        "foreign entity for tax years beginning after July 4, 2025 (docs/compliance/i7207--2025.pdf, page 2), but the official "
        "calculation methodology and threshold guidance are not among the documents in docs/compliance/. The dataset supplies the "
        "inputs (BOM quantities, purchase prices, supplier evidence); no pass/fail is computed.",
    },
]


def kwh_per_cell(nominal_voltage_v: float, rated_capacity_ah: float) -> float:
    """Assumption A1."""
    return nominal_voltage_v * rated_capacity_ah / 1000.0


def cell_definition_checks(energy_wh: float, energy_density_wh_per_l: float, capacity_to_power_ratio: float) -> dict:
    """Return each battery-cell definition test (Form 7207 instructions, line 5a) and whether it is met."""
    return {
        "energy_wh_ge_min": energy_wh >= RULES["BATTERY_CELL_MIN_ENERGY_WH"]["value"],
        "energy_density_ge_min": energy_density_wh_per_l >= RULES["BATTERY_CELL_MIN_ENERGY_DENSITY_WH_PER_L"]["value"],
        "capacity_to_power_le_max": capacity_to_power_ratio <= RULES["BATTERY_CELL_MAX_CAPACITY_TO_POWER_RATIO"]["value"],
    }


def cell_credit(units_sold: int, kwh_per_unit: float, sale_year: int = TAX_YEAR) -> float:
    """credit = units x kWh/unit x $/kWh x phase-out factor, rounded to cents."""
    rate = RULES["BATTERY_CELL_RATE_PER_KWH"]["value"]
    phase = RULES["PHASE_OUT_FACTOR"]["value"][sale_year]
    return round(units_sold * kwh_per_unit * rate * phase, 2)
