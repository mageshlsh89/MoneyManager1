import React from 'react'

export default function TransactionTable({rows}) {
  return (
    <div className="panel">
      <div className="title" style={{marginBottom: 8}}>Transactions</div>
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th className="muted" style={{textAlign: 'left', padding: 8}}>Date</th>
              <th className="muted" style={{textAlign: 'left', padding: 8}}>Merchant</th>
              <th className="muted" style={{textAlign: 'left', padding: 8}}>Amount</th>
              <th className="muted" style={{textAlign: 'left', padding: 8}}>Category</th>
              <th className="muted" style={{textAlign: 'left', padding: 8}}>Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{borderTop: '1px solid rgba(255,255,255,0.08)'}}>
                <td style={{padding: 8}}>{r.date}</td>
                <td style={{padding: 8}}>{r.merchant}</td>
                <td style={{padding: 8}}>£{r.amount.toFixed(2)}</td>
                <td style={{padding: 8}}>{r.category}</td>
                <td style={{padding: 8}}>{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
