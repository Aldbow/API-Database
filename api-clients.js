require('dotenv').config();
const XLSX = require('xlsx');

// Konfigurasi
const BASE_URL = 'https://data.inaproc.id/api';
const YEAR = 2024;
const LIMIT = 100; // Jumlah data per request (sesuaikan agar tidak timeout)
const DELAY_MS = 1000; // Delay antar request (1 detik) untuk menghindari rate limit

// Fungsi sleep untuk delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllData() {
    const JWT_TOKEN = process.env.JWT_TOKEN;

    if (!JWT_TOKEN) {
        console.error('Error: JWT_TOKEN tidak ditemukan di file .env');
        return;
    }

    let allData = [];
    let hasMore = true;
    let cursor = null;
    let page = 1;

    console.log(`\n=== Memulai Pengambilan Data RUP Tahun ${YEAR} ===`);

    try {
        while (hasMore) {
            // Bangun URL dengan parameter
            let url = `${BASE_URL}/v1/ekatalog-archive/paket-e-purchasing?limit=${LIMIT}&kode_klpd=K34&tahun=${YEAR}`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }

            console.log(`Fetching page ${page}... (Total accumulated: ${allData.length})`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Jika error 429 (Too Many Requests), tunggu lebih lama lalu retry (opsional, di sini kita throw dulu)
                throw new Error(`HTTP Error! Status: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            // Validasi struktur response
            const newData = result.data || [];
            allData = allData.concat(newData);

            // Cek pagination
            // API Inaproc biasanya mengembalikan 'cursor' di root atau dalam meta
            // Berdasarkan probe, cursor ada di root jika menggunakan cursor pagination
            if (result.cursor) {
                cursor = result.cursor;
            } else if (result.meta && result.meta.cursor) {
                cursor = result.meta.cursor;
            } else {
                // Jika tidak ada cursor baru, mungkin sudah selesai atau format berbeda
                // Kita akan bergantung pada flag 'has_more' jika ada, atau cek jumlah data
                cursor = null;
            }

            hasMore = result.has_more || (newData.length === LIMIT && !!cursor);

            // Safety break jika cursor tidak berubah/tidak ada tapi has_more true (infinite loop prevention)
            if (hasMore && !cursor) {
                console.warn('Warning: has_more is true but no cursor found. Stopping to prevent infinite loop.');
                hasMore = false;
            }

            page++;

            // Jeda sopan agar tidak diblokir
            if (hasMore) {
                await sleep(DELAY_MS);
            }
        }

        console.log(`\n=== Selesai! Total data berhasil diambil: ${allData.length} ===`);

        // --- Export to Excel ---
        if (allData.length > 0) {
            console.log('Generating Excel file...');
            const worksheet = XLSX.utils.json_to_sheet(allData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `RUP ${YEAR}`);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `hasil_rup_${YEAR}_full_${timestamp}.xlsx`;

            XLSX.writeFile(workbook, filename);
            console.log(`File berhasil disimpan sebagai: ${filename}`);
        } else {
            console.log('Tidak ada data yang ditemukan untuk tahun tersebut.');
        }

    } catch (error) {
        console.error('\nTerjadi Kesalahan:', error.message);
        if (error.cause) console.error('Cause:', error.cause);

        // Simpan data yang berhasil diambil sejauh ini (Emergency Save)
        if (allData.length > 0) {
            console.log('\nMelakukan penyimpanan darurat data yang sudah terambil...');
            const worksheet = XLSX.utils.json_to_sheet(allData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Emergency Save");
            const filename = `emergency_rup_${YEAR}_${Date.now()}.xlsx`;
            XLSX.writeFile(workbook, filename);
            console.log(`Data parsial tersimpan di: ${filename}`);
        }
    }
}

fetchAllData();