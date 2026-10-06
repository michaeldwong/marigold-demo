"""Section 45X rules applied by the simulated Marigold pipeline.

Every rule quotes the repository's regulatory documents (docs/compliance/). Page numbers are
PDF page numbers of the cited file. Nothing here is tax advice.
"""

I7207 = {"document": "Instructions for Form 7207 (Rev. December 2025)", "file": "i7207--2025.pdf"}
F7207 = {"document": "Form 7207 (Rev. December 2025)", "file": "f7207.pdf"}
TD10010 = {"document": "T.D. 10010, Advanced Manufacturing Production Credit, Final Rule (89 FR 85798)", "file": "FR-2024-10-28.pdf"}

RULES = [
    {"id": "R-SCOPE", **I7207, "section": "Purpose of Form", "page": 1,
     "title": "Who can claim the credit",
     "plain": "The credit is for eligible components that the company produced in the United States and sold during the tax year, in its business, to unrelated buyers.",
     "quote": "Form 7207 is used to claim the advanced manufacturing production credit under section 45X for eligible components produced by the "
              "taxpayer within the United States (including U.S. territories) and sold during the tax year in the taxpayer's trade or business to "
              "unrelated persons."},
    {"id": "R-CELL-DEF", **TD10010, "section": "§ 1.45X-3(e)(3)(i) Battery cells - Definition", "page": 426,
     "title": "What counts as a battery cell",
     "plain": "A battery cell must have positive and negative electrodes, store at least 12 watt-hours, and hold at least 100 watt-hours per liter of volume.",
     "quote": "Battery cell means an electrochemical cell- (A) Comprised of one or more positive electrodes and one or more negative electrodes; "
              "(B) With a volumetric energy density of not less than 100 watt-hours per liter; and (C) Capable of storing at least 12 watt-hours of energy."},
    {"id": "R-CAPACITY-MEASURE", **TD10010, "section": "§ 1.45X-3(e)(3)(ii) Capacity measurement", "page": 426,
     "title": "How capacity must be measured",
     "plain": "A cell's capacity must be measured using a recognized national or international test standard.",
     "quote": "Taxpayers must measure the capacity of a battery cell in accordance with a national or international standard, such as IEC 60086-1 "
              "(Primary Batteries), or an equivalent standard."},
    {"id": "R-CELL-RATE", **TD10010, "section": "§ 1.45X-3(e)(3)(iii) Credit amount", "page": 426,
     "title": "Credit amount for battery cells",
     "plain": "The credit is $35 for each kilowatt-hour of battery-cell capacity.",
     "quote": "For a battery cell, the credit amount is equal to the product of $35 multiplied by the capacity of such battery cell, subject to the "
              "limitation provided in paragraph (e)(5) of this section. The capacity of a battery cell is expressed on a kilowatt-hour basis."},
    {"id": "R-AGGREGATE", **I7207, "section": "Part II, Column (d) for lines 5a-5c", "page": 5,
     "title": "Total capacity = cells x capacity per cell",
     "plain": "Total qualifying capacity is the number of cells produced and sold multiplied by the capacity of each cell in kilowatt-hours.",
     "quote": "The aggregate capacity of eligible battery components is determined by multiplying the number of eligible components produced and sold "
              "by the capacity of each component expressed on a kilowatt-hour basis."},
    {"id": "R-CPR", **TD10010, "section": "§ 1.45X-3(e)(5) Capacity limitation", "page": 427,
     "title": "Capacity-to-power limit",
     "plain": "A cell's capacity divided by its maximum discharge power cannot exceed 100 to 1. Cells built for very slow discharge do not qualify.",
     "quote": "...a battery cell or battery module must not exceed a capacity-to-power ratio of 100:1. ... capacity-to-power ratio means, with respect to "
              "a battery cell or battery module, the ratio of the capacity of such cell or module to the maximum discharge amount of such cell or module."},
    {"id": "R-PRODUCED-BY", **TD10010, "section": "§ 1.45X-1(c)(1) Definition of produced by the taxpayer", "page": 415,
     "title": "The company must do the manufacturing",
     "plain": "The claimant must itself transform materials into the finished cell, not just do minor assembly.",
     "quote": "The term produced by the taxpayer means a process conducted by the taxpayer that substantially transforms constituent elements, materials, "
              "or subcomponents into a complete and distinct eligible component that is functionally different from that which would result from minor "
              "assembly or superficial modification..."},
    {"id": "R-US", **TD10010, "section": "§ 1.45X-1(d) Produced within the United States", "page": 417,
     "title": "Made in the United States",
     "plain": "The cell must be produced in the United States. Imported materials used to make it are allowed.",
     "quote": "...produced within the United States, as defined in section 638(1) of the Code... (2) Subcomponents. Constituent elements, materials, and "
              "subcomponents used in the production of eligible components are not subject to the domestic production requirement..."},
    {"id": "R-TRADE", **TD10010, "section": "§ 1.45X-1(e) Production and sale in a trade or business", "page": 417,
     "title": "Made and sold in the course of business",
     "plain": "Production and sale must be part of the company's regular business.",
     "quote": "An eligible component produced and sold by the taxpayer is taken into account for purposes of the section 45X credit only if the "
              "production and sale are in a trade or business (within the meaning of section 162 of the Code) of the taxpayer."},
    {"id": "R-UNRELATED", **I7207, "section": "Special Rules - Qualified sales", "page": 2,
     "title": "Sales must be to unrelated buyers",
     "plain": "Sales to companies under common control with the seller do not count unless a special election is made.",
     "quote": "For purposes of the advanced manufacturing production credit, persons are treated as related to each other if such persons would be "
              "treated as a single employer under the regulations prescribed under the common control rules of section 52(b)."},
    {"id": "R-MATERIAL-ASSISTANCE", **I7207, "section": "Special Rules - Material assistance from prohibited foreign entities", "page": 2,
     "title": "Supplier / foreign-entity sourcing restriction",
     "plain": "For 2026, a cell does not qualify if it includes 'material assistance' from a prohibited foreign entity - broadly, too much "
              "of its material cost traced to restricted foreign suppliers.",
     "quote": "For tax years beginning after July 4 2025, an \"eligible component\" doesn't include any property which includes any material assistance "
              "from a prohibited foreign entity...",
     "limitation": "The repository's documents state this restriction but do not include the method or thresholds for testing it. Marigold therefore "
                   "does not decide pass/fail; it organizes the cost and supplier evidence for review."},
    {"id": "R-PFE-TAXPAYER", **I7207, "section": "Special Rules - Prohibited foreign entity restrictions", "page": 2,
     "title": "The company itself must not be a restricted foreign entity",
     "plain": "No credit is allowed if the claiming company is a specified foreign entity or foreign-influenced entity.",
     "quote": "In general, for tax years beginning after July 4, 2025, no advanced manufacturing production credit will be allowed if the taxpayer is a "
              "specified foreign entity, as defined in section 7701(a)(51)(B), or a foreign-influenced entity, as defined in section 7701(a)(51)(D)..."},
    {"id": "R-48C", **I7207, "section": "Part I, Line 6", "page": 3,
     "title": "No double benefit with the §48C investment credit",
     "plain": "Cells made with equipment from a facility that already received a §48C investment credit (after August 16, 2022) cannot also earn 45X credit.",
     "quote": "You can't claim the advanced manufacturing production credit for eligible components produced using any property that is part of a "
              "facility for which a credit under section 48C was previously taken after August 16, 2022."},
    {"id": "R-PHASEOUT", **I7207, "section": "Phase out and termination", "page": 3,
     "title": "Full credit for 2026 sales",
     "plain": "The credit starts phasing down only for components sold after 2029, so 2026 sales receive 100%.",
     "quote": "The credit for advanced manufacturing production will phase out for eligible components sold after 2029, except applicable critical minerals."},
    {"id": "R-FACILITY", **I7207, "section": "Purpose of Form", "page": 1,
     "title": "One computation per facility",
     "plain": "The credit is computed separately for each production facility.",
     "quote": "File a separate Form 7207 for each facility operated to produce and sell eligible components."},
]

RULE_BY_ID = {r["id"]: r for r in RULES}
CELL_RATE_PER_KWH = 35.0
MIN_ENERGY_WH = 12.0
MIN_ENERGY_DENSITY_WH_PER_L = 100.0
MAX_CAPACITY_TO_POWER = 100.0
PHASE_OUT = {2026: 1.0}
