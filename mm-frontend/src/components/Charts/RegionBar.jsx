import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function RegionBar({data}) {
  return (
    <div className="panel" style={{height: 320}}>
      <div className="title" style={{marginBottom: 8}}>UK vs India spending</div>
      <ResponsiveContainer width="100%" aspect={2}>
        <BarChart data={data}>
          <XAxis dataKey="region" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Bar dataKey="amount" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
