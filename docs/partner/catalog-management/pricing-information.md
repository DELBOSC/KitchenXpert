# Pricing and Currency Management

**Last Updated:** 2026-01-10

Guidelines for product pricing, currencies, VAT handling, and dynamic pricing.

## Price Formats

**Format**: Decimal with 2 places (e.g., 299.99)

**Rules**:

- No currency symbols in price value
- Use separate currency field
- Must be positive number
- Consistent decimal separator (.)

## Currency Support

**Supported Currencies** (ISO 4217):

- EUR - Euro (primary)
- USD - US Dollar
- GBP - British Pound
- CHF - Swiss Franc
- SEK - Swedish Krona
- NOK - Norwegian Krone
- DKK - Danish Krone
- PLN - Polish Zloty

## VAT/Tax Handling

**Price Including/Excluding VAT**:

- Specify in product data: `price_includes_vat: true/false`
- VAT rates by country automatically applied
- Displayed to users based on location

**VAT Rates**:

- Germany: 19%
- France: 20%
- UK: 20%
- Others: Varies by country

## Dynamic Pricing

**Real-Time Updates via API**:

```python
api.update_product('CAB-001', {
  'price': 279.99
})
```

**Bulk Price Updates**:

- CSV upload with new prices
- API batch update endpoint
- FTP sync (Enterprise)

**Update Frequency**:

- Real-time: Instant via API
- Daily: Scheduled bulk updates
- On-demand: Manual portal updates

## Discounts and Promotions

**Discount Types**:

- Percentage off: 20% discount
- Fixed amount: €50 off
- Buy X get Y: Bundling offers

**Display**:

- Original price shown with strikethrough
- Sale price prominently displayed
- Savings amount/percentage shown

**Implementation**:

```json
{
  "price": 299.99,
  "sale_price": 249.99,
  "discount_percentage": 17,
  "sale_end_date": "2026-02-28"
}
```

## Bulk Pricing

**Quantity Tiers**:

- 1-9 units: €299.99 each
- 10-49 units: €279.99 each
- 50+ units: €259.99 each

**Implementation**:

```json
{
  "price_tiers": [
    { "min_qty": 1, "price": 299.99 },
    { "min_qty": 10, "price": 279.99 },
    { "min_qty": 50, "price": 259.99 }
  ]
}
```

## Regional Pricing

**Different Prices by Country/Region**:

```json
{
  "price_default": 299.99,
  "currency": "EUR",
  "regional_prices": {
    "DE": 299.99,
    "FR": 319.99,
    "UK": 279.0,
    "CH": 329.0
  }
}
```

## Price Change Notifications

**Webhook Events**:

- `product.price_changed`
- `product.sale_started`
- `product.sale_ended`

**Email Alerts**: Partners notified of significant price changes

## Currency Conversion

**Automatic Conversion**:

- Daily exchange rates updated
- Displayed to users in their local currency
- Actual transaction in partner's currency

## Price Display Rules

**Display Options**:

- "From €299" - Starting at price
- "€299.99" - Exact price
- "RRP €349, Now €299" - Recommended retail price + sale

## Historical Pricing

**Price Tracking** (Pro/Enterprise):

- Historical price data retained
- Price trend analytics
- Competitive pricing insights

## Best Practices

1. **Update regularly**: Keep prices current
2. **Be competitive**: Monitor competitor pricing
3. **Clear VAT indication**: Specify inc/exc VAT
4. **Honor displayed prices**: Price shown = price charged
5. **Plan sales strategically**: Align with seasons/holidays

_Last Updated: 2026-01-10_
