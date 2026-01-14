require('dotenv').config();

async function probe() {
    const JWT_TOKEN = process.env.JWT_TOKEN;
    const BASE_URL = 'https://data.inaproc.id/api';

    try {
        const response = await fetch(`${BASE_URL}/v1/ekatalog-archive/paket-e-purchasing?limit=1&kode_klpd=K34&tahun=2024`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Status:', response.status);
            console.error('Text:', await response.text());
            return;
        }


        const data = await response.json();
        const keys = Object.keys(data);
        console.log('Root Keys:', keys);

        // Check for common pagination locations
        if (data.meta) console.log('Meta:', data.meta);
        if (data.cursor) console.log('Cursor at root:', data.cursor);
        if (data.pagination) console.log('Pagination:', data.pagination);
        if (data.next_page_url) console.log('Next Page URL:', data.next_page_url);

        console.log('Has "cursor" key?', keys.includes('cursor'));
        console.log('Has "has_more" key?', keys.includes('has_more'));


    } catch (e) {
        console.error(e);
    }
}

probe();
