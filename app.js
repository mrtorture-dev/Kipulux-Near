document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const dniInput = document.getElementById('dni-input');
    const errorMessage = document.getElementById('error-message');
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameSpan = document.getElementById('user-name');
    const purchasesList = document.getElementById('purchases-list');
    
    // Modal Elements
    const certModal = document.getElementById('cert-modal');
    const closeBtn = document.querySelector('.close-btn');
    const certModalBody = document.getElementById('cert-modal-body');    
    let purchasesData = {};
    let activePurchases = [];

    // Cargar los datos del JSON
    // Asumimos que el script de python generó compras.json en el mismo directorio
    fetch('compras.json?v=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                console.warn('compras.json no encontrado, se utilizarán datos de prueba si se falla, o simplemente muestra error.');
                throw new Error('JSON file not found');
            }
            return response.json();
        })
        .then(data => {
            purchasesData = data;
            console.log('Datos de compras cargados exitosamente.');
        })
        .catch(err => {
            console.error('Error cargando compras.json:', err);
            // Si hay un error, dejamos el diccionario vacío para que valide como que no existe el DNI
        });

    // --- Lógica de Cliente ---
    const showArtisanBtn = document.getElementById('show-artisan-login');
    const backToClientBtn = document.getElementById('back-to-client');
    const artisanLoginForm = document.getElementById('artisan-login-form');
    
    showArtisanBtn.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        artisanLoginForm.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    });

    backToClientBtn.addEventListener('click', () => {
        artisanLoginForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('artisan-error').classList.add('hidden');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dni = dniInput.value.trim();

        if (dni.length !== 8) {
            showError('El DNI debe tener 8 dígitos.');
            return;
        }

        // Mostrar indicador de carga
        errorMessage.classList.add('hidden');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Buscando compras...';

        console.log(`Buscando compras en WooCommerce para DNI: ${dni}`);
        fetch(`/api/compras-woo/${dni}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Error en la API de WooCommerce');
                }
                return res.json();
            })
            .then(wooPurchases => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;

                if (wooPurchases && wooPurchases.length > 0) {
                    console.log(`Encontradas ${wooPurchases.length} compras en WooCommerce.`);
                    showDashboard(dni, wooPurchases);
                } else {
                    console.log('No se encontraron compras en WooCommerce. Usando compras locales...');
                    if (purchasesData[dni]) {
                        showDashboard(dni, purchasesData[dni]);
                    } else {
                        showError('No se encontraron compras para este DNI.');
                    }
                }
            })
            .catch(err => {
                console.warn('Error al buscar en WooCommerce, reintentando con base local:', err);
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;

                if (purchasesData[dni]) {
                    showDashboard(dni, purchasesData[dni]);
                } else {
                    showError('No se encontraron compras para este DNI.');
                }
            });
    });

    logoutBtn.addEventListener('click', () => {
        dashboardSection.classList.remove('active');
        setTimeout(() => {
            dashboardSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            // Allow small delay before adding active class for fade in
            setTimeout(() => {
                loginSection.classList.add('active');
                dniInput.value = '';
                errorMessage.classList.add('hidden');
            }, 50);
        }, 300);
    });

    // --- Lógica de Artesano ---
    const artisanDashboard = document.getElementById('artisan-dashboard');
    const artisanLogoutBtn = document.getElementById('artisan-logout-btn');
    const artisanUser = document.getElementById('artisan-user');
    const artisanPass = document.getElementById('artisan-pass');
    const artisanError = document.getElementById('artisan-error');

    artisanLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (artisanUser.value === 'artesano_alda' && artisanPass.value === 'alda2026') {
            document.getElementById('artisan-name').textContent = 'Juan Pérez (Maestro Artesano)';
            loginSection.classList.remove('active');
            setTimeout(() => {
                loginSection.classList.add('hidden');
                artisanDashboard.classList.remove('hidden');
                setTimeout(() => {
                    artisanDashboard.classList.add('active');
                }, 50);
            }, 300);
        } else {
            artisanError.classList.remove('hidden');
            const card = document.querySelector('.login-card');
            card.style.transform = 'translateY(0) translateX(-10px)';
            setTimeout(() => card.style.transform = 'translateY(0) translateX(10px)', 100);
            setTimeout(() => card.style.transform = 'translateY(0) translateX(-10px)', 200);
            setTimeout(() => card.style.transform = 'translateY(0) translateX(0)', 300);
        }
    });

    artisanLogoutBtn.addEventListener('click', () => {
        artisanDashboard.classList.remove('active');
        setTimeout(() => {
            artisanDashboard.classList.add('hidden');
            loginSection.classList.remove('hidden');
            setTimeout(() => {
                loginSection.classList.add('active');
                artisanUser.value = '';
                artisanPass.value = '';
                artisanError.classList.add('hidden');
            }, 50);
        }, 300);
    });

    const downloadArtisanCertBtn = document.getElementById('download-artisan-cert');
    downloadArtisanCertBtn.addEventListener('click', () => {
        const artisanName = document.getElementById('artisan-name').textContent;
        const points = 1;
        const hash = "0x6d9742dc0b1d1cc50a80c9c335f9acde85b656ab00a8a9219ad63a382575ff6c";
        const contract = "0x43488c09cc0dac4acaa6747e556b6150f863b813";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Certificado de Excelencia - Alda</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #f9f9f9;
                        height: 100vh;
                        -webkit-print-color-adjust: exact;
                    }
                    .certificate {
                        width: 800px;
                        height: 600px;
                        background: white;
                        border: 15px solid #c8a064;
                        padding: 40px;
                        box-sizing: border-box;
                        text-align: center;
                        position: relative;
                        box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    }
                    .logo {
                        width: 150px;
                        margin-bottom: 20px;
                    }
                    .title {
                        font-size: 32px;
                        color: #333;
                        margin: 10px 0;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }
                    .subtitle {
                        font-size: 18px;
                        color: #666;
                        margin-bottom: 40px;
                    }
                    .presented-to {
                        font-size: 16px;
                        color: #999;
                        margin-bottom: 10px;
                    }
                    .name {
                        font-size: 40px;
                        font-weight: bold;
                        color: #c8a064;
                        margin-bottom: 30px;
                        font-style: italic;
                    }
                    .description {
                        font-size: 16px;
                        line-height: 1.6;
                        color: #444;
                        margin: 0 auto 40px;
                        width: 80%;
                    }
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 50px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .footer-block {
                        text-align: left;
                        font-size: 12px;
                        color: #666;
                    }
                    .footer-block strong {
                        color: #333;
                        display: block;
                        margin-bottom: 5px;
                    }
                    .seal {
                        position: absolute;
                        bottom: 40px;
                        right: 40px;
                        width: 100px;
                        height: 100px;
                        border-radius: 50%;
                        background: #c8a064;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        text-align: center;
                        font-size: 14px;
                        border: 4px double white;
                        box-shadow: 0 0 0 4px #c8a064;
                    }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <img src="logo_alda.svg" class="logo" alt="Alda" onerror="this.src='https://alda.com.pe/wp-content/uploads/2021/08/logo-alda.png'">
                    <h1 class="title">Certificado de Excelencia</h1>
                    <div class="subtitle">Validado por la Red Syscoin</div>
                    
                    <div class="presented-to">Se otorga el presente reconocimiento a:</div>
                    <div class="name">${artisanName}</div>
                    
                    <div class="description">
                        Por su destacada labor artesanal y compromiso con la calidad. Ha acumulado satisfactoriamente <strong>${points} punto(s)</strong> de recompensa mediante la elaboración y certificación de productos de cuero genuino bajo los más altos estándares de curtiembre y manufactura.
                    </div>
                    
                    <div class="footer">
                        <div class="footer-block">
                            <strong>Firma Digital (Hash Tx)</strong>
                            ${hash}
                        </div>
                        <div class="footer-block">
                            <strong>Smart Contract</strong>
                            ${contract}
                        </div>
                    </div>
                    
                    <div class="seal">
                        ORIGEN<br>VERIFICADO
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        
        // Shake effect
        const card = document.querySelector('.login-card');
        card.style.transform = 'translateY(0) translateX(-10px)';
        setTimeout(() => card.style.transform = 'translateY(0) translateX(10px)', 100);
        setTimeout(() => card.style.transform = 'translateY(0) translateX(-10px)', 200);
        setTimeout(() => card.style.transform = 'translateY(0) translateX(0)', 300);
    }

    function showDashboard(dni, purchases) {
        // Hide login, show dashboard
        loginSection.classList.remove('active');
        setTimeout(() => {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            
            // Render data
            const nombreCliente = purchases[0]['Nombre Cliente'] || 'Cliente';
            userNameSpan.textContent = nombreCliente;
            
            // Guardar en variable activa y resetear filtros a valores por defecto
            activePurchases = purchases;
            document.getElementById('search-product').value = '';
            document.getElementById('filter-category').value = 'all';
            document.getElementById('sort-date').value = 'desc';
            
            applyFiltersAndRender();

            setTimeout(() => {
                dashboardSection.classList.add('active');
            }, 50);
        }, 300);
    }

    function applyFiltersAndRender() {
        const searchQuery = document.getElementById('search-product').value.toLowerCase().trim();
        const categoryFilter = document.getElementById('filter-category').value;
        const dateSort = document.getElementById('sort-date').value;

        // 1. Filtrar
        let filtered = activePurchases.filter(p => {
            const item = (p['Item'] || '').toLowerCase();
            const sku = (p['SKU'] || '').toLowerCase();

            // Excluir envíos, descuentos, servicios
            if (item.includes('envio') || item.includes('envío') || item.includes('descuento') || item.includes('servicio')) {
                return false;
            }

            // Filtro por búsqueda de texto
            const matchesSearch = item.includes(searchQuery) || sku.includes(searchQuery);

            // Filtro por categoría
            let matchesCategory = true;
            if (categoryFilter === 'billetera') {
                matchesCategory = item.includes('billetera');
            } else if (categoryFilter === 'cartera') {
                matchesCategory = item.includes('cartera') || item.includes('bolso') || item.includes('mochila');
            } else if (categoryFilter === 'otro') {
                matchesCategory = !item.includes('billetera') && !item.includes('cartera') && !item.includes('bolso') && !item.includes('mochila');
            }

            return matchesSearch && matchesCategory;
        });

        // 2. Ordenar por fecha
        filtered.sort((a, b) => {
            const dateA = new Date(a['F. Emision'] || a['F.Registo'] || '1970-01-01');
            const dateB = new Date(b['F. Emision'] || b['F.Registo'] || '1970-01-01');

            if (dateSort === 'desc') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

        renderPurchases(filtered);
    }

    function renderPurchases(purchases) {
        purchasesList.innerHTML = '';

        if (purchases.length === 0) {
            purchasesList.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; width: 100%; grid-column: 1 / -1; padding: 2rem 0;">No se encontraron productos con los criterios especificados.</p>';
            return;
        }

        // Renderizar cada compra
        purchases.forEach((p, index) => {
            const fecha = p['F. Emision'] || p['F.Registo'] || 'Fecha desconocida';
            const moneda = p['Moneda'] || 'S/';
            const total = parseFloat(p['Total Item'] || 0).toFixed(2);
            const item = p['Item'] || 'Producto sin nombre';
            const sku = p['SKU'] || 'Sin SKU';
            const estado = p['Estado de la venta'] || p['Estado de pago'] || 'Completado';

            const card = document.createElement('div');
            card.className = 'purchase-card';
            card.style.animationDelay = `${index * 0.1}s`;
            
            let imageHtml = '';
            if (p['Foto_Producto']) {
                imageHtml = `<img src="${p['Foto_Producto']}" alt="${item}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">`;
            } else if (sku.includes('BC007NN') || (item.toLowerCase().includes('billetera') && item.toLowerCase().includes('negro'))) {
                imageHtml = `<img src="https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png" alt="${item}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">`;
            }

            card.innerHTML = `
                <div class="purchase-header">
                    <span class="purchase-date">${fecha}</span>
                    <span class="purchase-status">${estado}</span>
                </div>
                <div class="purchase-body">
                    <div class="purchase-item" style="display: flex; align-items: center;">
                        ${imageHtml}
                        <div style="flex: 1;">
                            <div class="item-name">${item}</div>
                            <div class="item-sku">SKU: ${sku}</div>
                        </div>
                        <div class="item-price">${p['Cantidad'] || 1} x ${moneda} ${parseFloat(p['Precio Unitario'] || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div class="purchase-footer">
                    <div class="footer-left">
                        <span class="total-label">Total</span>
                        <span class="total-amount">${moneda} ${total}</span>
                    </div>
                    <button class="btn-cert premium-btn" data-sku="${sku}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; pointer-events: none;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Ver Certificación
                    </button>
                </div>
            `;
            
            purchasesList.appendChild(card);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.btn-cert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sku = e.currentTarget.getAttribute('data-sku');
                openCertModal(sku);
            });
        });
    }

    // Registrar event listeners de filtros
    document.getElementById('search-product').addEventListener('input', applyFiltersAndRender);
    document.getElementById('filter-category').addEventListener('change', applyFiltersAndRender);
    document.getElementById('sort-date').addEventListener('change', applyFiltersAndRender);

    // Modal Logic
    closeBtn.addEventListener('click', () => {
        certModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target == certModal) {
            certModal.classList.add('hidden');
        }
    });

    function openCertModal(sku) {
        const purchase = activePurchases.find(p => p.SKU === sku);
        if (purchase && purchase.registrado && purchase.trazabilidad) {
            const t = purchase.trazabilidad;
            
            // Renderizar lotes recursivos
            let lotesHtml = '';
            if (t.lotes && t.lotes.length > 0) {
                t.lotes.forEach((lote, index) => {
                    lotesHtml += `
                        <div style="margin-top: 0.5rem; padding-left: 0.75rem; border-left: 2px solid var(--color-border); font-size: 0.75rem; color: var(--color-text-muted);">
                            <p><strong>Sub-lote Cuero:</strong> ${lote.ID_Lote_Cuero_Utilizado || 'No registrado'}</p>
                            <p><strong>Curtiembre RUC:</strong> ${lote.ruc_curtiembre || 'No registrado'}</p>
                            ${lote.PDF_Certificado_Previo ? `<p><a href="${lote.PDF_Certificado_Previo}" target="_blank" style="color: #c8a064; text-decoration: underline;">Certificado Curtiembre (PDF)</a></p>` : ''}
                        </div>
                    `;
                });
            } else {
                lotesHtml = '<p style="font-size: 0.75rem; color: var(--color-text-muted);">No se encontraron lotes vinculados.</p>';
            }

            certModalBody.innerHTML = `
                <div class="cert-timeline">
                    <div class="timeline-item">
                        <div class="timeline-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </div>
                        <div class="timeline-content">
                            <h3>1. Origen Verificado</h3>
                            <p><strong>Procedencia:</strong> Predio agropecuario verificado</p>
                            ${lotesHtml}
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <div class="timeline-content">
                            <h3>2. Procesamiento Eco-Responsable</h3>
                            <p><strong>Confeccionado por:</strong> ${t.taller_artesano || 'Maestro Curtidor ALDA'}</p>
                            <p><strong>RUC Taller:</strong> ${t.RUC_Fabricante || 'No registrado'}</p>
                            <p><strong>Curtido:</strong> Vegetal libre de cromo</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="timeline-content">
                            <h3>3. Calidad de Manufactura</h3>
                            <p><strong>Producto SKU:</strong> ${sku}</p>
                            <p><strong>Token ID en Blockchain:</strong> #${purchase.nft_token_id}</p>
                            ${t.PDF_Certificado_Previo ? `<p><a href="${t.PDF_Certificado_Previo}" target="_blank" style="color: #c8a064; text-decoration: underline; font-weight: 600;">Ver Certificado Oficial (PDF)</a></p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="cert-footer">
                    <div class="hash-box">
                        <span class="hash-label">Smart Contract (zkSYS)</span>
                        <span class="hash-value">${t.contract_address}</span>
                    </div>
                    <span class="badge success">Certificación Blockchain Válida ✅</span>
                </div>
            `;
        } else {
            // Mostrar modal "En Proceso"
            certModalBody.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: #fffbeb; color: #d97706; margin-bottom: 1.5rem; animation: pulse 2s infinite;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: bold; color: var(--color-text-main); margin-bottom: 0.5rem;">Certificación En Proceso</h3>
                    <p style="font-size: 0.875rem; color: var(--color-text-muted); max-width: 320px; margin: 0 auto 1.5rem;">
                        La compra de este producto (SKU: <strong>${sku}</strong>) fue procesada en WooCommerce. El taller artesanal está certificando el origen del cuero y la costura.
                    </p>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); border-top: 1px solid var(--color-border); padding-top: 1rem; font-family: monospace;">
                        Estado: Pendiente de Registro Blockchain (zkSYS)
                    </div>
                </div>
            `;
        }
        certModal.classList.remove('hidden');
    }
});
