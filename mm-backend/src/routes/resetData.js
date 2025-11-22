// routes/resetData.js
module.exports = async function resetDataHandler(req, res, next) {
    try {
      // perform reset actions
      // await resetDatabase();
  
      return res.status(200).json({ ok: true, message: 'Reset complete' });
    } catch (err) {
      console.error('resetData error', err);
      return res.status(500).json({ ok: false, error: 'Reset failed' });
    }
  };
  