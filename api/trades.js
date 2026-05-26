module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { NOTION_TOKEN, DATABASE_ID } = process.env;
  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }
  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sorts: [{ property: 'Date', direction: 'ascending' }], page_size: 100 }),
    });
    const data = await r.json();
    const trades = data.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        account: p['Account']?.rich_text?.[0]?.plain_text || '',
        direction: p['Direction']?.select?.name || '',
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
        date: p['Date']?.date?.start || null,
      };
    }).filter(t => t.entry !== null);
    return res.json({ trades, updatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
