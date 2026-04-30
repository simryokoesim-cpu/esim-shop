export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    app: 'tgesim-miniapp',
    api: 'health',
    ts: new Date().toISOString()
  });
}
