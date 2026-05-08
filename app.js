  // ============================================================
  // UTILIDADES RUT CHILENO
  // ============================================================
  const RUT = {
    /** Limpia el RUT dejando solo números y la letra K */
    clean(rut) {
      return rut.replace(/[^0-9kK]/g, '').toUpperCase();
    },

    /** Formatea el RUT con puntos y guión: 12.345.678-9 */
    format(rut) {
      const clean = this.clean(rut);
      if (clean.length < 2) return clean;
      const body = clean.slice(0, -1);
      const dv   = clean.slice(-1);
      let formatted = '';
      let count = 0;
      for (let i = body.length - 1; i >= 0; i--) {
        formatted = body[i] + formatted;
        count++;
        if (count % 3 === 0 && i !== 0) formatted = '.' + formatted;
      }
      return formatted + '-' + dv;
    },

    /** Valida el dígito verificador del RUT chileno */
    validate(rut) {
      const clean = this.clean(rut);
      if (clean.length < 2) return false;
      const body = clean.slice(0, -1);
      const dv   = clean.slice(-1).toUpperCase();
      if (!/^\d+$/.test(body)) return false;
      let sum = 0;
      let mul = 2;
      for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * mul;
        mul = mul < 7 ? mul + 1 : 2;
      }
      const expected = 11 - (sum % 11);
      let expectedDV;
      if (expected === 11) expectedDV = '0';
      else if (expected === 10) expectedDV = 'K';
      else expectedDV = String(expected);
      return dv === expectedDV;
    }
  };

  // ============================================================
  // ESTADO DE LA APP
  // ============================================================
  let reservas  = JSON.parse(localStorage.getItem('eclat_reservas')  || '[]');
  let clientes  = JSON.parse(localStorage.getItem('eclat_clientes')  || '[]');
  let editandoId = null;

  const roomPrices = {
    individual: 85000,
    doble:     120000,
    suite:     180000,
    premium:   280000,
    penthouse: 450000
  };
  const servicePrices = {
    desayuno:   12000,
    spa:        25000,
    transfer:   35000,
    parking:     8000,
    late_checkout: 20000,
    decoracion: 45000
  };

  function save() {
    localStorage.setItem('eclat_reservas', JSON.stringify(reservas));
    localStorage.setItem('eclat_clientes', JSON.stringify(clientes));
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('section-' + id)?.classList.add('active');
      document.querySelectorAll(`.nav-btn[data-section="${id}"]`).forEach(b => b.classList.add('active'));
      if (id === 'mis-reservas') renderReservas();
      if (id === 'clientes')     renderClientes();
    });
  });

  // ============================================================
  // TOAST
  // ============================================================
  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ============================================================
  // HELPERS DE VALIDACIÓN
  // ============================================================
  function setError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    const input = document.getElementById(id.replace('-error', ''));
    if (input) { input.classList.toggle('invalid', !!msg); input.classList.toggle('valid', !msg && input.value); }
  }
  function clearErrors(ids) { ids.forEach(id => setError(id, '')); }

  function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validateTel(v)   { return /^[\+]?[\d\s\-]{7,15}$/.test(v); }

  // ============================================================
  // RUT INPUT BINDING (live formatting + indicator)
  // ============================================================
  function bindRutInput(inputId, indicatorId, errorId) {
    const input = document.getElementById(inputId);
    const ind   = document.getElementById(indicatorId);
    if (!input) return;

    input.addEventListener('input', () => {
      const raw = RUT.clean(input.value);
      if (raw.length >= 2) {
        input.value = RUT.format(raw);
      }
      if (raw.length >= 7) {
        const ok = RUT.validate(raw);
        ind.textContent   = ok ? '✓' : '✗';
        ind.style.color   = ok ? 'var(--success)' : 'var(--error)';
        input.classList.toggle('valid',   ok);
        input.classList.toggle('invalid', !ok);
        if (errorId) setError(errorId, ok ? '' : 'RUT inválido');
      } else {
        ind.textContent = '';
        input.classList.remove('valid', 'invalid');
        if (errorId) setError(errorId, '');
      }
    });

    input.addEventListener('blur', () => {
      const raw = RUT.clean(input.value);
      if (raw.length >= 2) input.value = RUT.format(raw);
    });
  }

  bindRutInput('rut',     'rut-indicator',     'rut-error');
  bindRutInput('cli-rut', 'cli-rut-indicator', 'cli-rut-error');

  // ============================================================
  // RESERVAS – PRECIO EN TIEMPO REAL
  // ============================================================
  function calcTotal() {
    const hab  = document.getElementById('habitacion').value;
    const ci   = document.getElementById('checkin').value;
    const co   = document.getElementById('checkout').value;
    const svcs = [...document.querySelectorAll('input[name="servicios"]:checked')].map(c => c.value);

    if (!hab || !ci || !co) { document.getElementById('price-total').textContent = '$0'; return; }
    const d1 = new Date(ci), d2 = new Date(co);
    const nights = Math.max(0, Math.round((d2 - d1) / 86400000));
    if (nights <= 0) { document.getElementById('price-total').textContent = '$0'; return; }

    let total = (roomPrices[hab] || 0) * nights;
    svcs.forEach(s => { total += (servicePrices[s] || 0); });

    document.getElementById('price-total').textContent =
      '$' + total.toLocaleString('es-CL');
  }

  ['habitacion','checkin','checkout'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', calcTotal));
  document.querySelectorAll('input[name="servicios"]').forEach(cb =>
    cb.addEventListener('change', calcTotal));

  // ===== CHAR COUNT =====
  document.getElementById('observaciones')?.addEventListener('input', function() {
    document.getElementById('obs-count').textContent = this.value.length + ' / 300';
  });
  document.getElementById('cli-notas')?.addEventListener('input', function() {
    document.getElementById('cli-notas-count').textContent = this.value.length + ' / 400';
  });

  // ===== FECHA MIN =====
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('checkin').min  = hoy;
  document.getElementById('checkout').min = hoy;

  // ============================================================
  // FORMULARIO RESERVA – SUBMIT
  // ============================================================
  document.getElementById('reserva-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const errIds = ['nombre-error','apellido-error','email-error','telefono-error',
                    'rut-error','checkin-error','checkout-error','habitacion-error','huespedes-error'];
    clearErrors(errIds);

    const get = id => document.getElementById(id)?.value.trim() || '';
    let ok = true;

    const nombre    = get('nombre');
    const apellido  = get('apellido');
    const email     = get('email');
    const telefono  = get('telefono');
    const rut       = get('rut');
    const checkin   = get('checkin');
    const checkout  = get('checkout');
    const habitacion= get('habitacion');
    const huespedes = get('huespedes');

    if (!nombre)   { setError('nombre-error',   'El nombre es obligatorio.'); ok = false; }
    if (!apellido) { setError('apellido-error',  'El apellido es obligatorio.'); ok = false; }
    if (!email || !validateEmail(email)) { setError('email-error', 'Ingresa un email válido.'); ok = false; }
    if (!telefono || !validateTel(telefono)) { setError('telefono-error', 'Ingresa un teléfono válido.'); ok = false; }

    if (!rut || !RUT.validate(RUT.clean(rut))) {
      setError('rut-error', 'RUT inválido o incompleto.'); ok = false;
    }
    if (!checkin)  { setError('checkin-error',  'Selecciona fecha de check-in.'); ok = false; }
    if (!checkout) { setError('checkout-error', 'Selecciona fecha de check-out.'); ok = false; }
    if (checkin && checkout && checkout <= checkin) {
      setError('checkout-error', 'El check-out debe ser posterior al check-in.'); ok = false;
    }
    if (!habitacion) { setError('habitacion-error', 'Selecciona una habitación.'); ok = false; }
    if (!huespedes)  { setError('huespedes-error',  'Selecciona N° de huéspedes.'); ok = false; }

    if (!ok) return;

    const svcs = [...document.querySelectorAll('input[name="servicios"]:checked')].map(c => c.value);
    const d1 = new Date(checkin), d2 = new Date(checkout);
    const nights = Math.round((d2 - d1) / 86400000);
    let total = (roomPrices[habitacion] || 0) * nights;
    svcs.forEach(s => total += (servicePrices[s] || 0));

    const reserva = {
      id: 'R-' + Date.now(),
      folio: 'ECL-' + String(reservas.length + 1).padStart(4, '0'),
      nombre, apellido, email, telefono,
      rut: RUT.format(RUT.clean(rut)),
      checkin, checkout, habitacion, huespedes,
      servicios: svcs,
      observaciones: get('observaciones'),
      total, estado: 'activa',
      creada: new Date().toLocaleDateString('es-CL')
    };

    reservas.push(reserva);
    save();

    document.getElementById('form-success-banner').textContent =
      `✦ Reserva ${reserva.folio} confirmada. Total estimado: $${total.toLocaleString('es-CL')}`;
    document.getElementById('form-success-banner').classList.remove('hidden');
    setTimeout(() => document.getElementById('form-success-banner').classList.add('hidden'), 5000);

    this.reset();
    document.getElementById('price-total').textContent = '$0';
    document.getElementById('obs-count').textContent = '0 / 300';
    document.getElementById('rut-indicator').textContent = '';
    toast('Reserva ' + reserva.folio + ' confirmada ✦', 'success');
  });

  document.getElementById('btn-limpiar').addEventListener('click', () => {
    document.getElementById('reserva-form').reset();
    document.getElementById('price-total').textContent = '$0';
    document.getElementById('obs-count').textContent = '0 / 300';
    document.getElementById('rut-indicator').textContent = '';
    document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
    document.querySelectorAll('input.invalid, select.invalid').forEach(e => e.classList.remove('invalid'));
  });

  // ============================================================
  // FORMULARIO CLIENTES – SUBMIT
  // ============================================================
  document.getElementById('cliente-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const errIds = ['cli-nombre-error','cli-apellido-error','cli-rut-error',
                    'cli-email-error','cli-telefono-error'];
    clearErrors(errIds);

    const get = id => document.getElementById(id)?.value.trim() || '';
    let ok = true;

    const nombre    = get('cli-nombre');
    const apellido  = get('cli-apellido');
    const rut       = get('cli-rut');
    const email     = get('cli-email');
    const telefono  = get('cli-telefono');

    if (!nombre)   { setError('cli-nombre-error',   'El nombre es obligatorio.'); ok = false; }
    if (!apellido) { setError('cli-apellido-error',  'El apellido es obligatorio.'); ok = false; }

    if (!rut || !RUT.validate(RUT.clean(rut))) {
      setError('cli-rut-error', 'RUT inválido o incompleto.'); ok = false;
    } else {
      // Verificar duplicado
      const rutLimpio = RUT.clean(rut);
      const dup = clientes.find(c => RUT.clean(c.rut) === rutLimpio && c.id !== editandoId);
      if (dup) { setError('cli-rut-error', 'Este RUT ya está registrado.'); ok = false; }
    }

    if (!email || !validateEmail(email)) { setError('cli-email-error', 'Ingresa un email válido.'); ok = false; }
    if (!telefono || !validateTel(telefono)) { setError('cli-telefono-error', 'Ingresa un teléfono válido.'); ok = false; }

    const fnac = get('cli-fecha-nac');
    if (fnac) {
      const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
      const nacDate = new Date(fnac);
      if (nacDate >= hoyDate) { setError('cli-fecha-nac-error', 'La fecha debe ser anterior a hoy.'); ok = false; }
    }

    if (!ok) return;

    const prefs = [...document.querySelectorAll('input[name="pref"]:checked')].map(c => c.value);

    const cliente = {
      id:            editandoId || 'C-' + Date.now(),
      nombre, apellido,
      rut:           RUT.format(RUT.clean(rut)),
      email,         telefono,
      fechaNac:      fnac,
      nacionalidad:  get('cli-nacionalidad'),
      tipo:          get('cli-tipo'),
      direccion:     get('cli-direccion'),
      preferencias:  prefs,
      notas:         get('cli-notas'),
      registrado:    new Date().toLocaleDateString('es-CL')
    };

    if (editandoId) {
      const idx = clientes.findIndex(c => c.id === editandoId);
      if (idx > -1) clientes[idx] = cliente;
      editandoId = null;
      document.getElementById('btn-guardar-cliente').querySelector('.btn-text').textContent = 'Registrar Cliente';
    } else {
      clientes.push(cliente);
    }
    save();

    document.getElementById('cli-success-banner').textContent =
      `✦ Cliente ${nombre} ${apellido} (${cliente.rut}) registrado correctamente.`;
    document.getElementById('cli-success-banner').classList.remove('hidden');
    setTimeout(() => document.getElementById('cli-success-banner').classList.add('hidden'), 4000);

    this.reset();
    document.getElementById('cli-notas-count').textContent = '0 / 400';
    document.getElementById('cli-rut-indicator').textContent = '';
    document.querySelectorAll('#cliente-form .field-error').forEach(e => e.textContent = '');
    document.querySelectorAll('#cliente-form input.invalid, #cliente-form select.invalid')
      .forEach(e => e.classList.remove('invalid'));

    renderClientes();
    toast('Cliente registrado ✦', 'success');
  });

  document.getElementById('btn-limpiar-cliente').addEventListener('click', () => {
    editandoId = null;
    document.getElementById('cliente-form').reset();
    document.getElementById('cli-notas-count').textContent = '0 / 400';
    document.getElementById('cli-rut-indicator').textContent = '';
    document.querySelectorAll('#cliente-form .field-error').forEach(e => e.textContent = '');
    document.querySelectorAll('#cliente-form input.invalid, #cliente-form select.invalid')
      .forEach(e => e.classList.remove('invalid'));
    document.getElementById('btn-guardar-cliente').querySelector('.btn-text').textContent = 'Registrar Cliente';
  });

  // ============================================================
  // RENDER CLIENTES
  // ============================================================
  const tipoBadge = {
    regular:     { bg:'#F0EBE0', color:'#5F5E5A', label:'Regular' },
    vip:         { bg:'rgba(201,169,110,0.15)', color:'#9A7A45', label:'VIP' },
    corporativo: { bg:'#E6F1FB', color:'#185FA5', label:'Corporativo' },
    frecuente:   { bg:'#D8F3DC', color:'#2D6A4F', label:'Frecuente' }
  };

  function renderClientes() {
    const filtro = document.getElementById('cli-filtro-tipo')?.value || 'todos';
    const lista  = filtro === 'todos' ? clientes : clientes.filter(c => c.tipo === filtro);
    const cont   = document.getElementById('clientes-lista');
    document.getElementById('cli-stat').textContent = lista.length + ' registros';

    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div><p>No hay clientes en este filtro.</p></div>`;
      return;
    }

    cont.innerHTML = lista.map(c => {
      const iniciales = (c.nombre[0] || '') + (c.apellido[0] || '');
      const badge = tipoBadge[c.tipo] || tipoBadge.regular;
      const prefs = c.preferencias?.length
        ? `<span class="label">Preferencias</span><span>${c.preferencias.join(', ')}</span>`
        : '';
      return `
      <div class="cliente-card">
        <div class="cliente-header">
          <div class="cliente-avatar">${iniciales.toUpperCase()}</div>
          <div>
            <div class="cliente-name">${c.nombre} ${c.apellido}</div>
            <div class="cliente-rut">${c.rut}</div>
          </div>
          <span class="rut-badge ok" style="margin-left:auto; background:${badge.bg}; color:${badge.color};">${badge.label}</span>
        </div>
        <div class="cliente-info">
          <span class="label">Email</span>
          <span>${c.email}</span>
          <span class="label" style="margin-top:4px;">Teléfono</span>
          <span>${c.telefono}</span>
          ${c.direccion ? `<span class="label" style="margin-top:4px;">Dirección</span><span>${c.direccion}</span>` : ''}
          ${prefs}
        </div>
        <div class="cliente-actions">
          <button class="btn-sm" onclick="editarCliente('${c.id}')">Editar</button>
          <button class="btn-sm" onclick="verCliente('${c.id}')">Ver detalle</button>
          <button class="btn-sm danger" onclick="eliminarCliente('${c.id}')">Eliminar</button>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('cli-filtro-tipo')?.addEventListener('change', renderClientes);

  // ============================================================
  // CRUD CLIENTES
  // ============================================================
  window.eliminarCliente = function(id) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    clientes = clientes.filter(c => c.id !== id);
    save();
    renderClientes();
    toast('Cliente eliminado', 'error');
  };

  window.editarCliente = function(id) {
    const c = clientes.find(cl => cl.id === id);
    if (!c) return;
    editandoId = id;
    document.getElementById('cli-nombre').value     = c.nombre;
    document.getElementById('cli-apellido').value   = c.apellido;
    document.getElementById('cli-rut').value        = c.rut;
    document.getElementById('cli-email').value      = c.email;
    document.getElementById('cli-telefono').value   = c.telefono;
    document.getElementById('cli-fecha-nac').value  = c.fechaNac || '';
    document.getElementById('cli-nacionalidad').value = c.nacionalidad || '';
    document.getElementById('cli-tipo').value       = c.tipo || 'regular';
    document.getElementById('cli-direccion').value  = c.direccion || '';
    document.getElementById('cli-notas').value      = c.notas || '';

    // checkboxes prefs
    document.querySelectorAll('input[name="pref"]').forEach(cb => {
      cb.checked = (c.preferencias || []).includes(cb.value);
    });

    document.getElementById('cli-notas-count').textContent =
      (c.notas || '').length + ' / 400';

    // Trigger indicator
    const ev = new Event('input', { bubbles: true });
    document.getElementById('cli-rut').dispatchEvent(ev);

    document.getElementById('btn-guardar-cliente').querySelector('.btn-text').textContent = 'Actualizar Cliente';
    document.getElementById('section-clientes').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('cli-nombre').focus();
  };

  window.verCliente = function(id) {
    const c = clientes.find(cl => cl.id === id);
    if (!c) return;
    const badge = tipoBadge[c.tipo] || tipoBadge.regular;
    const iniciales = (c.nombre[0] || '') + (c.apellido[0] || '');
    const reservasCliente = reservas.filter(r => RUT.clean(r.rut) === RUT.clean(c.rut));

    document.getElementById('modal-content').innerHTML = `
      <div style="padding-bottom:1rem; border-bottom: 1px solid var(--cream-dark); margin-bottom:1.5rem; display:flex; align-items:center; gap:16px;">
        <div class="cliente-avatar" style="width:56px;height:56px;font-size:22px;">${iniciales.toUpperCase()}</div>
        <div>
          <h2 id="modal-title" style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;color:var(--ink);">${c.nombre} ${c.apellido}</h2>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <span style="font-size:13px;color:var(--stone);">${c.rut}</span>
            <span class="rut-badge ok" style="background:${badge.bg};color:${badge.color};">${badge.label}</span>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Email</div><div style="font-size:14px;color:var(--ink-soft);">${c.email}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Teléfono</div><div style="font-size:14px;color:var(--ink-soft);">${c.telefono}</div></div>
        ${c.fechaNac ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Nacimiento</div><div style="font-size:14px;color:var(--ink-soft);">${c.fechaNac}</div></div>` : ''}
        ${c.nacionalidad ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Nacionalidad</div><div style="font-size:14px;color:var(--ink-soft);">${c.nacionalidad}</div></div>` : ''}
        ${c.direccion ? `<div style="grid-column:1/-1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Dirección</div><div style="font-size:14px;color:var(--ink-soft);">${c.direccion}</div></div>` : ''}
        ${c.preferencias?.length ? `<div style="grid-column:1/-1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Preferencias</div><div style="font-size:14px;color:var(--ink-soft);">${c.preferencias.join(', ')}</div></div>` : ''}
        ${c.notas ? `<div style="grid-column:1/-1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Notas</div><div style="font-size:14px;color:var(--ink-soft);">${c.notas}</div></div>` : ''}
      </div>
      <div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:12px;">
          Reservas vinculadas (${reservasCliente.length})
        </div>
        ${reservasCliente.length ? reservasCliente.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--cream-dark);font-size:13px;">
            <span style="color:var(--gold-dark);font-weight:500;">${r.folio}</span>
            <span style="color:var(--stone);">${r.checkin} → ${r.checkout}</span>
            <span style="color:var(--ink-soft);">${r.habitacion}</span>
            <span class="card-badge badge-${r.estado}">${r.estado}</span>
          </div>`).join('') : '<p style="font-size:13px;color:var(--stone);">Sin reservas registradas.</p>'}
      </div>`;

    document.getElementById('modal-overlay').classList.remove('hidden');
  };

  // ============================================================
  // RENDER RESERVAS
  // ============================================================
  function renderReservas() {
    const filtroEst = document.getElementById('filtro-estado').value;
    const filtroHab = document.getElementById('filtro-hab').value;

    let lista = reservas.filter(r => {
      if (filtroEst !== 'todas' && r.estado !== filtroEst) return false;
      if (filtroHab !== 'todas' && r.habitacion !== filtroHab) return false;
      return true;
    });

    const activas   = reservas.filter(r => r.estado === 'activa').length;
    const ingresos  = reservas.filter(r => r.estado === 'activa').reduce((a,b) => a + b.total, 0);
    document.getElementById('stat-total').innerHTML   = `Total: <strong>${reservas.length}</strong>`;
    document.getElementById('stat-activas').innerHTML = `Activas: <strong>${activas}</strong>`;
    document.getElementById('stat-ingresos').innerHTML= `Ingresos: <strong>$${ingresos.toLocaleString('es-CL')}</strong>`;

    if (!lista.length) {
      document.getElementById('reservas-lista').innerHTML =
        `<div class="empty-state"><div class="empty-icon">✦</div><p>No hay reservas en este filtro.</p></div>`;
      return;
    }

    document.getElementById('reservas-lista').innerHTML = lista.map(r => `
      <div class="reserva-card">
        <div class="card-header">
          <span class="card-folio">${r.folio}</span>
          <span class="card-badge badge-${r.estado}">${r.estado}</span>
        </div>
        <div class="card-name">${r.nombre} ${r.apellido}</div>
        <div class="card-room">${r.habitacion} · ${r.huespedes} huésped(es)</div>
        <div class="card-dates">📅 ${r.checkin} → ${r.checkout}</div>
        <div class="card-price">$${r.total.toLocaleString('es-CL')}</div>
        <div class="card-actions">
          <button class="btn-sm" onclick="verReserva('${r.id}')">Detalle</button>
          ${r.estado === 'activa'
            ? `<button class="btn-sm danger" onclick="cancelarReserva('${r.id}')">Cancelar</button>`
            : ''}
        </div>
      </div>`).join('');
  }

  ['filtro-estado','filtro-hab'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', renderReservas));

  window.cancelarReserva = function(id) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    const r = reservas.find(r => r.id === id);
    if (r) { r.estado = 'cancelada'; save(); renderReservas(); toast('Reserva cancelada', 'error'); }
  };

  window.verReserva = function(id) {
    const r = reservas.find(r => r.id === id);
    if (!r) return;
    document.getElementById('modal-content').innerHTML = `
      <h2 id="modal-title" style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;color:var(--ink);margin-bottom:1.5rem;">
        ${r.folio} <span class="card-badge badge-${r.estado}" style="font-size:12px;">${r.estado}</span>
      </h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:14px;">
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Huésped</div><div>${r.nombre} ${r.apellido}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">RUT</div><div>${r.rut}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Email</div><div>${r.email}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Teléfono</div><div>${r.telefono}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Check-in</div><div>${r.checkin}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Check-out</div><div>${r.checkout}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Habitación</div><div>${r.habitacion}</div></div>
        <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Huéspedes</div><div>${r.huespedes}</div></div>
        ${r.servicios?.length ? `<div style="grid-column:1/-1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Servicios</div><div>${r.servicios.join(', ')}</div></div>` : ''}
        ${r.observaciones ? `<div style="grid-column:1/-1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--stone);margin-bottom:4px;">Observaciones</div><div>${r.observaciones}</div></div>` : ''}
        <div style="grid-column:1/-1; background:var(--ink); color:var(--white); padding:14px 20px; border-radius:var(--radius); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <span style="font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--stone-light);">Total estimado</span>
          <span style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--gold);">$${r.total.toLocaleString('es-CL')}</span>
        </div>
      </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  };

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  function buscar(q) {
    if (!q) { document.getElementById('buscar-resultados').innerHTML = ''; return; }
    q = q.toLowerCase();
    const res = reservas.filter(r =>
      (r.nombre + ' ' + r.apellido).toLowerCase().includes(q) ||
      r.rut.toLowerCase().replace(/[.\-]/g,'').includes(q.replace(/[.\-]/g,'')) ||
      r.email.toLowerCase().includes(q) ||
      r.folio.toLowerCase().includes(q)
    );
    if (!res.length) {
      document.getElementById('buscar-resultados').innerHTML =
        '<div class="empty-state"><div class="empty-icon">✦</div><p>Sin resultados.</p></div>';
      return;
    }
    document.getElementById('buscar-resultados').innerHTML = res.map(r => `
      <div class="reserva-card">
        <div class="card-header">
          <span class="card-folio">${r.folio}</span>
          <span class="card-badge badge-${r.estado}">${r.estado}</span>
        </div>
        <div class="card-name">${r.nombre} ${r.apellido}</div>
        <div class="card-room">${r.habitacion}</div>
        <div class="card-dates">📅 ${r.checkin} → ${r.checkout}</div>
        <div class="card-price">$${r.total.toLocaleString('es-CL')}</div>
        <div class="card-actions">
          <button class="btn-sm" onclick="verReserva('${r.id}')">Detalle</button>
        </div>
      </div>`).join('');
  }

  document.getElementById('btn-buscar').addEventListener('click', () =>
    buscar(document.getElementById('buscador').value.trim()));
  document.getElementById('buscador').addEventListener('keydown', e => {
    if (e.key === 'Enter') buscar(document.getElementById('buscador').value.trim());
  });

  // ============================================================
  // MODAL
  // ============================================================
  document.getElementById('modal-close').addEventListener('click', () =>
    document.getElementById('modal-overlay').classList.add('hidden'));
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay'))
      document.getElementById('modal-overlay').classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('modal-overlay').classList.add('hidden');
  });
