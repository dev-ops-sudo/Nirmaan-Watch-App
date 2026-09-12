async function test() {
  try {
    const res = await fetch('http://localhost:5173/api/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'drinking water works in Varanasi',
        state: 'Uttar Pradesh'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Summary:', data.summary);
    console.log('Retrieval Source:', data.retrievalSource);
    console.log('Confidence:', data.confidence);
    console.log('Citations Count:', data.citations?.length);
    console.log('Sample Citation:', data.citations?.[0]);
    console.log('Answer preview:\n', data.answer.slice(0, 300));
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
