// Existing repository legal copy, ported from privacy.html and terms.html.
interface LegalContent {
  title: string;
  updated: string;
  sections: {
    id: string;
    title: string;
    blocks: ({ type: 'paragraph'; text: string } | { type: 'list'; items: string[] })[];
  }[];
}

export const legalDocuments: Record<'privacy' | 'terms', LegalContent> = {
  "privacy": {
    "title": "Kebijakan Privasi",
    "updated": "11 Oktober 2026",
    "sections": [
      {
        "id": "pendahuluan",
        "title": "1. Pendahuluan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Kebijakan Privasi ini menjelaskan bagaimana URT mengumpulkan, menggunakan, menyimpan, dan melindungi informasi yang berkaitan dengan penggunaan platform URT."
          },
          {
            "type": "paragraph",
            "text": "Dengan menggunakan URT, Anda memahami bahwa informasi tertentu diperlukan agar fitur pengelolaan servis, pelanggan, teknisi, tracking, laporan, dan transaksi dapat berfungsi."
          }
        ]
      },
      {
        "id": "informasi-dikumpulkan",
        "title": "2. Informasi yang Dikumpulkan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Informasi yang dapat dikumpulkan melalui URT dapat meliputi:"
          },
          {
            "type": "list",
            "items": [
              "Nama dan informasi kontak pengguna.",
              "Informasi akun dan kredensial yang diperlukan untuk autentikasi.",
              "Informasi tempat servis dan data operasional.",
              "Data pelanggan yang dimasukkan oleh tempat servis.",
              "Informasi perangkat yang diservis, seperti jenis perangkat, merek, model, dan keluhan.",
              "Informasi teknisi, tugas, status pekerjaan, dan catatan servis.",
              "Informasi transaksi, paket, dan status pembayaran sesuai kebutuhan layanan.",
              "Informasi teknis seperti alamat IP, jenis perangkat, browser, dan aktivitas penggunaan yang diperlukan untuk keamanan dan operasional sistem."
            ]
          }
        ]
      },
      {
        "id": "sumber-data",
        "title": "3. Sumber Informasi",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Informasi dapat diperoleh langsung dari pengguna ketika membuat akun, mengisi data servis, menggunakan fitur URT, atau berkomunikasi dengan layanan."
          },
          {
            "type": "paragraph",
            "text": "Untuk fitur tertentu, informasi juga dapat diberikan oleh tempat servis atau pihak lain yang memiliki hubungan dengan proses servis, misalnya data pelanggan dan perangkat yang dimasukkan oleh tempat servis."
          }
        ]
      },
      {
        "id": "penggunaan-data",
        "title": "4. Penggunaan Informasi",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Informasi dapat digunakan untuk:"
          },
          {
            "type": "list",
            "items": [
              "Menyediakan dan menjalankan fitur URT.",
              "Mengelola akun dan akses pengguna.",
              "Mencatat dan menampilkan informasi servis.",
              "Menyediakan fitur tracking servis kepada pelanggan.",
              "Membantu tempat servis mengelola pelanggan, teknisi, laporan, dan transaksi.",
              "Memproses atau memverifikasi pembayaran apabila fitur pembayaran tersedia.",
              "Menjaga keamanan, mencegah penyalahgunaan, dan mendeteksi aktivitas yang mencurigakan.",
              "Memperbaiki kinerja, keamanan, dan pengalaman penggunaan platform.",
              "Memenuhi kewajiban hukum apabila diwajibkan oleh peraturan yang berlaku."
            ]
          }
        ]
      },
      {
        "id": "data-pelanggan",
        "title": "5. Data Pelanggan Tempat Servis",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Tempat servis dapat memasukkan data pelanggan dan data perangkat ke dalam URT untuk menjalankan proses servis. Tempat servis bertanggung jawab memastikan bahwa pengumpulan dan penggunaan data tersebut dilakukan secara sah dan sesuai kewajiban mereka kepada pelanggan."
          },
          {
            "type": "paragraph",
            "text": "URT menggunakan data tersebut untuk menyediakan fungsi yang diminta oleh tempat servis, termasuk pencatatan servis dan penyampaian status servis kepada pelanggan melalui fitur yang tersedia."
          }
        ]
      },
      {
        "id": "berbagi-data",
        "title": "6. Pembagian Informasi",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT tidak menjual informasi pribadi pengguna untuk tujuan pemasaran. Informasi dapat diproses atau dibagikan secara terbatas apabila diperlukan untuk menyediakan layanan, menjaga keamanan, memenuhi kewajiban hukum, atau menjalankan layanan pihak ketiga yang digunakan oleh platform."
          },
          {
            "type": "paragraph",
            "text": "Apabila layanan pembayaran atau infrastruktur pihak ketiga digunakan, informasi yang diperlukan dapat diproses oleh penyedia tersebut sesuai kebijakan privasi dan ketentuan mereka."
          }
        ]
      },
      {
        "id": "keamanan",
        "title": "7. Keamanan Informasi",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT menerapkan langkah teknis dan operasional yang wajar untuk membantu melindungi informasi dari akses, perubahan, penggunaan, atau pengungkapan yang tidak sah."
          },
          {
            "type": "paragraph",
            "text": "Namun, tidak ada sistem elektronik yang dapat dijamin sepenuhnya bebas dari risiko keamanan. Pengguna juga bertanggung jawab menjaga keamanan akun, kata sandi, dan perangkat yang digunakan untuk mengakses URT."
          }
        ]
      },
      {
        "id": "penyimpanan",
        "title": "8. Penyimpanan dan Penghapusan Data",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Informasi disimpan selama diperlukan untuk menyediakan layanan, memenuhi kebutuhan operasional, menjaga keamanan, menyelesaikan sengketa, atau memenuhi kewajiban hukum yang berlaku."
          },
          {
            "type": "paragraph",
            "text": "Ketika data tidak lagi diperlukan untuk tujuan tersebut, URT dapat menghapus, menganonimkan, atau menyimpannya dalam bentuk yang diperlukan sesuai kewajiban yang berlaku."
          }
        ]
      },
      {
        "id": "hak-pengguna",
        "title": "9. Hak Pengguna",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Sesuai dengan ketentuan hukum yang berlaku, pengguna dapat memiliki hak untuk meminta akses, perbaikan, pembaruan, atau penghapusan informasi tertentu, serta hak lain yang diberikan oleh peraturan yang berlaku."
          },
          {
            "type": "paragraph",
            "text": "Permintaan dapat disampaikan melalui kanal kontak resmi URT. Permintaan dapat memerlukan verifikasi identitas untuk membantu melindungi keamanan data."
          }
        ]
      },
      {
        "id": "cookies",
        "title": "10. Cookie dan Teknologi Serupa",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat menggunakan cookie atau teknologi serupa untuk membantu menjaga sesi login, keamanan, preferensi, dan fungsi teknis platform."
          },
          {
            "type": "paragraph",
            "text": "Jika analitik atau teknologi pihak ketiga digunakan, penerapannya dapat mengikuti kebijakan masing-masing penyedia layanan."
          }
        ]
      },
      {
        "id": "tautan",
        "title": "11. Tautan ke Layanan Pihak Ketiga",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat menyediakan tautan atau integrasi menuju layanan pihak ketiga. Kebijakan privasi dan ketentuan layanan pihak ketiga tersebut berlaku secara terpisah dan tidak dikendalikan oleh URT."
          }
        ]
      },
      {
        "id": "anak",
        "title": "12. Privasi Anak",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT ditujukan untuk penggunaan layanan tempat servis dan pengelolaan servis. Pengguna tidak boleh menggunakan platform untuk mengumpulkan data anak secara tidak sah atau tanpa dasar yang diperlukan."
          }
        ]
      },
      {
        "id": "perubahan",
        "title": "13. Perubahan Kebijakan Privasi",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat memperbarui Kebijakan Privasi ini apabila terdapat perubahan layanan, teknologi, proses pengolahan data, atau ketentuan hukum yang berlaku."
          },
          {
            "type": "paragraph",
            "text": "Versi terbaru akan dipublikasikan pada halaman ini beserta tanggal pembaruannya."
          }
        ]
      },
      {
        "id": "kontak",
        "title": "14. Hubungi Kami",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Jika Anda memiliki pertanyaan, permintaan terkait data pribadi, atau pertanyaan mengenai Kebijakan Privasi ini, silakan gunakan kanal kontak resmi yang tersedia pada platform URT."
          }
        ]
      }
    ]
  },
  "terms": {
    "title": "Syarat & Ketentuan",
    "updated": "11 Oktober 2026",
    "sections": [
      {
        "id": "pendahuluan",
        "title": "1. Pendahuluan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Syarat dan Ketentuan ini mengatur penggunaan platform URT, yaitu platform digital yang membantu tempat servis mengelola servis, pelanggan, teknisi, tracking servis, laporan, dan transaksi."
          },
          {
            "type": "paragraph",
            "text": "Dengan mengakses atau menggunakan URT, Anda menyatakan telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, Anda tidak diperkenankan menggunakan layanan URT."
          }
        ]
      },
      {
        "id": "definisi",
        "title": "2. Definisi",
        "blocks": []
      },
      {
        "id": "akun",
        "title": "3. Akun dan Keamanan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Beberapa fitur URT memerlukan akun. Pengguna bertanggung jawab memberikan informasi yang benar, lengkap, dan dapat diperbarui."
          },
          {
            "type": "paragraph",
            "text": "Pengguna bertanggung jawab menjaga kerahasiaan informasi login dan seluruh aktivitas yang dilakukan melalui akunnya. Jika terdapat dugaan akses yang tidak sah, pengguna harus segera mengambil langkah pengamanan dan menghubungi pihak URT melalui kanal resmi yang tersedia."
          }
        ]
      },
      {
        "id": "penggunaan",
        "title": "4. Penggunaan Layanan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Pengguna wajib menggunakan URT secara wajar dan sesuai hukum yang berlaku."
          },
          {
            "type": "paragraph",
            "text": "Pengguna tidak diperkenankan:"
          },
          {
            "type": "list",
            "items": [
              "Menggunakan URT untuk aktivitas yang melanggar hukum.",
              "Mengakses akun, data, atau sistem milik pihak lain tanpa izin.",
              "Mengunggah atau menyebarkan konten yang melanggar hak pihak lain.",
              "Mengganggu, merusak, atau mencoba memperoleh akses tidak sah ke sistem URT.",
              "Menggunakan layanan untuk menyebarkan malware, spam, atau aktivitas berbahaya lainnya.",
              "Menyalahgunakan data pelanggan atau data pengguna lain yang tersedia melalui layanan."
            ]
          }
        ]
      },
      {
        "id": "data",
        "title": "5. Data dan Informasi Servis",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Tempat servis bertanggung jawab atas keakuratan data yang dimasukkan ke dalam URT, termasuk data pelanggan, perangkat, keluhan, diagnosis, pekerjaan, teknisi, status servis, dan transaksi."
          },
          {
            "type": "paragraph",
            "text": "Tempat servis juga bertanggung jawab memastikan bahwa mereka memiliki dasar atau izin yang diperlukan untuk memasukkan dan menggunakan data pihak lain melalui URT."
          }
        ]
      },
      {
        "id": "pelacakan",
        "title": "6. Tracking Servis",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Fitur tracking memungkinkan pelanggan melihat informasi status servis berdasarkan data yang diberikan oleh tempat servis. Informasi seperti status, diagnosis, estimasi, suku cadang, dan biaya dapat berubah sesuai perkembangan pekerjaan."
          },
          {
            "type": "paragraph",
            "text": "URT menyediakan sarana pengelolaan dan penyampaian informasi tersebut, tetapi tidak bertanggung jawab atas keputusan teknis, kualitas perbaikan, harga, atau hasil pekerjaan yang dilakukan oleh tempat servis dan teknisi."
          }
        ]
      },
      {
        "id": "langganan",
        "title": "7. Paket dan Pembayaran",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat menyediakan paket berlangganan bulanan dan tahunan sebagaimana ditampilkan pada halaman harga atau pada saat proses pendaftaran."
          },
          {
            "type": "paragraph",
            "text": "Harga, fitur, periode berlangganan, dan ketentuan pembayaran yang berlaku adalah informasi yang ditampilkan pada saat pembelian. Jika pembayaran diproses melalui penyedia pembayaran pihak ketiga, proses pembayaran juga tunduk pada ketentuan penyedia tersebut."
          },
          {
            "type": "paragraph",
            "text": "Pengguna bertanggung jawab memastikan informasi pembayaran yang diberikan benar dan memiliki kewenangan untuk menggunakan metode pembayaran tersebut."
          }
        ]
      },
      {
        "id": "kekayaan",
        "title": "8. Kekayaan Intelektual",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Nama, merek, tampilan, perangkat lunak, desain, teks, logo, dan komponen lain yang menjadi bagian dari URT merupakan milik URT atau digunakan berdasarkan hak yang sesuai, kecuali dinyatakan lain."
          },
          {
            "type": "paragraph",
            "text": "Pengguna tidak diperkenankan menyalin, memodifikasi, mendistribusikan, menjual kembali, atau mengeksploitasi bagian dari layanan tanpa izin yang sah dari pemilik hak terkait."
          }
        ]
      },
      {
        "id": "ketersediaan",
        "title": "9. Ketersediaan Layanan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT berupaya menjaga layanan agar dapat digunakan dengan baik. Namun, layanan dapat mengalami gangguan sementara karena pemeliharaan, pembaruan, gangguan jaringan, kegagalan penyedia infrastruktur, atau keadaan lain di luar kendali URT."
          },
          {
            "type": "paragraph",
            "text": "URT dapat melakukan perubahan, pemeliharaan, atau pembaruan terhadap fitur dan sistem untuk meningkatkan keamanan, kinerja, dan kualitas layanan."
          }
        ]
      },
      {
        "id": "tanggung-jawab",
        "title": "10. Batas Tanggung Jawab",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT menyediakan sarana digital untuk membantu pengelolaan operasional tempat servis. Tanggung jawab atas kegiatan servis, diagnosis, perbaikan, harga, komunikasi dengan pelanggan, dan keputusan operasional tetap berada pada pihak yang menjalankan kegiatan tersebut."
          },
          {
            "type": "paragraph",
            "text": "Pengguna bertanggung jawab atas data, konten, dan aktivitas yang dilakukan menggunakan akunnya."
          }
        ]
      },
      {
        "id": "penghentian",
        "title": "11. Penangguhan dan Penghentian Akun",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat membatasi, menangguhkan, atau menghentikan akses terhadap akun apabila terdapat pelanggaran terhadap Syarat dan Ketentuan, penyalahgunaan layanan, aktivitas yang berisiko terhadap keamanan sistem, atau alasan operasional yang sah."
          },
          {
            "type": "paragraph",
            "text": "Pengguna juga dapat berhenti menggunakan layanan sesuai prosedur yang tersedia pada platform."
          }
        ]
      },
      {
        "id": "perubahan",
        "title": "12. Perubahan Syarat dan Ketentuan",
        "blocks": [
          {
            "type": "paragraph",
            "text": "URT dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Perubahan akan dipublikasikan melalui halaman ini dengan tanggal pembaruan yang sesuai."
          },
          {
            "type": "paragraph",
            "text": "Dengan tetap menggunakan layanan setelah perubahan berlaku, pengguna dianggap menerima ketentuan yang telah diperbarui."
          }
        ]
      },
      {
        "id": "hukum",
        "title": "13. Hukum yang Berlaku",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Syarat dan Ketentuan ini ditafsirkan dan dilaksanakan berdasarkan hukum yang berlaku di Republik Indonesia, sepanjang tidak ditentukan lain oleh ketentuan yang berlaku."
          }
        ]
      },
      {
        "id": "kontak",
        "title": "14. Hubungi Kami",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Jika Anda memiliki pertanyaan mengenai Syarat dan Ketentuan ini atau penggunaan layanan URT, silakan gunakan kanal kontak resmi yang tersedia pada platform URT."
          }
        ]
      }
    ]
  }
};
