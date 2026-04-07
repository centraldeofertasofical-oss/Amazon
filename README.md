# amazon-scraper

Serviço de scraping dinâmico da Amazon para n8n.

## Endpoint

POST /amazon/search

## Body

{
  "url": "https://www.amazon.com.br/deals",
  "maxCycles": 40,
  "maxNoGrowthCycles": 8,
  "headless": true
}
