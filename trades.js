module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { NOTION_TOKEN, DATABASE_ID } = process.env;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN or DATABASE_ID environment variables.' });
  }

  try {
    let trades = [];
    let cursor = undefined;

    // Paginate through all Notion results (100 per page max)
    do {
      const body = {
        sorts: [{ property: 'Date', direction: 'ascending' }],
        page_size: 100,
      };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: `Notion API error: ${err}` });
      }

      const data = await response.json();

      const parsed = data.results
        .map(page => {
          const p = page.properties;
          return {
            id: page.id,
            name: p['Trade Name']?.title?.[0]?.plain_text || '',
            account: p['Account']?.rich_text?.[0]?.plain_text || '',
            accountType: p['Account Type']?.select?.name || '',
            direction: p['Direction']?.select?.name || '',
            symbol: p['Symbol']?.select?.name || 'XAUUSD',
            entry: p['Entry Price']?.number ?? null,
            sl: p['Stop Loss']?.number ?? null,
            tp: p['Take Profit']?.number ?? null,
            exit: p['Exit Price']?.number ?? null,
            lots: p['Lot Size']?.number ?? null,
            pnl: p['P&L ($)']?.number ?? null,
            rr: p['R:R Ratio']?.number ?? null,
            status: p['Status']?.select?.name || '',
            setup: p['Setup Type']?.select?.name || '',
            session: p['Session']?.select?.name || '',
            winReason: p['Win Reason']?.select?.name || '',
            lossReason: p['Loss Reason']?.select?.name || '',
            date: p['Date']?.date?.start || null,
            confidence: p['Confidence']?.select?.name || '',
            thesis: p['Trade Reason / Thesis']?.rich_text?.[0]?.plain_text || '',
            lessons: p['Lessons Learned']?.rich_text?.[0]?.plain_text || '',
          };
        })
        .filter(t => t.entry !== null);

      trades = trades.concat(parsed);
      cursor = data.next_cursor;
    } while (cursor);

    return res.json({ trades, updatedAt: new Date().toISOString(), total: trades.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
