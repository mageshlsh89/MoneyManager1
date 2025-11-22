const baseURL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api')

const request = async (url, options = {}) => {
  const res = await fetch(baseURL + url, options)
  const ct = res.headers.get('content-type') || ''
  let data
  if (ct.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data !== null ? (data.error || res.statusText) : res.statusText
    const err = new Error(msg)
    err.response = { status: res.status, data }
    throw err
  }
  return { data }
}

const buildHeaders = (headers) => headers ? { ...headers } : {}

const get = (url, config = {}) => request(url, { method: 'GET', headers: buildHeaders(config.headers) })

const post = (url, body, config = {}) => {
  const headers = buildHeaders(config.headers)
  let payload = body
  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return request(url, { method: 'POST', headers, body: payload })
}

const put = (url, body, config = {}) => {
  const headers = buildHeaders(config.headers)
  let payload = body
  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return request(url, { method: 'PUT', headers, body: payload })
}

const del = (url, config = {}) => request(url, { method: 'DELETE', headers: buildHeaders(config.headers) })

export default { get, post, put, delete: del, baseURL }
