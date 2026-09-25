document.addEventListener('DOMContentLoaded', () => {

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conPuntero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const ns = 'http://www.w3.org/2000/svg';

    function crear(tipo, clase, texto) {
        const elemento = document.createElement(tipo);
        if (clase) elemento.className = clase;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function animarContador(elemento) {

        const destino = parseFloat(elemento.dataset.contador);
        if (Number.isNaN(destino)) return;

        const decimales = parseInt(elemento.dataset.decimales || '0', 10);
        const prefijo = elemento.dataset.prefijo || '';
        const sufijo = elemento.dataset.sufijo || '';
        const duracion = 1500;
        const arranque = performance.now();

        function paso(ahora) {
            const avance = Math.min((ahora - arranque) / duracion, 1);
            const suavizado = 1 - Math.pow(1 - avance, 3);
            const valor = (destino * suavizado).toFixed(decimales).replace('.', ',');
            elemento.textContent = prefijo + valor + sufijo;
            if (avance < 1) requestAnimationFrame(paso);
        }

        requestAnimationFrame(paso);

    }


    const titulo = document.querySelector('.tituloPrincipal');

    if (titulo && !sinMovimiento) {

        const partes = [];

        [...titulo.childNodes].forEach(nodo => {

            if (nodo.nodeType === Node.TEXT_NODE) {

                nodo.textContent.split(/(\s+)/).forEach(trozo => {
                    if (trozo === '') return;
                    if (!trozo.trim()) {
                        partes.push(document.createTextNode(trozo));
                        return;
                    }
                    const palabra = crear('span', 'palabra', trozo);
                    partes.push(palabra);
                });

            } else if (nodo.nodeName === 'BR') {

                partes.push(nodo.cloneNode(true));

            } else {

                const palabra = crear('span', 'palabra');
                palabra.appendChild(nodo.cloneNode(true));
                partes.push(palabra);

            }

        });

        titulo.replaceChildren(...partes);

        titulo.querySelectorAll('.palabra').forEach((palabra, indice) => {
            palabra.style.setProperty('--retraso', (indice * 65) + 'ms');
        });

        titulo.classList.add('animado');

    }


    function crearConectores(contenedor, lienzo, pares) {

        const trazos = pares.map(par => {

            const grupo = document.createElementNS(ns, 'g');
            grupo.setAttribute('class', 'trazo');

            const linea = document.createElementNS(ns, 'path');
            linea.setAttribute('class', 'cnx');
            linea.setAttribute('pathLength', '1');

            const punta = document.createElementNS(ns, 'polygon');
            punta.setAttribute('class', 'punta');

            grupo.append(linea, punta);
            lienzo.append(grupo);

            return Object.assign({ grupo, linea, punta }, par);

        });

        function rutaVertical(x1, y1, x2, y2) {

            const medio = (y1 + y2) / 2;
            const dx = x2 - x1;

            if (Math.abs(dx) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;

            const signo = Math.sign(dx);
            const radio = Math.max(0, Math.min(18, Math.abs(dx) / 2, medio - y1, y2 - medio));

            return `M ${x1} ${y1} L ${x1} ${medio - radio}` +
                ` Q ${x1} ${medio} ${x1 + signo * radio} ${medio}` +
                ` L ${x2 - signo * radio} ${medio}` +
                ` Q ${x2} ${medio} ${x2} ${medio + radio}` +
                ` L ${x2} ${y2}`;

        }

        function rutaHorizontal(x1, y1, x2, y2) {

            const medio = (x1 + x2) / 2;
            const dy = y2 - y1;

            if (Math.abs(dy) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;

            const signoY = Math.sign(dy);
            const signoX = Math.sign(x2 - x1);
            const radio = Math.max(0, Math.min(18, Math.abs(dy) / 2, Math.abs(x2 - x1) / 2));

            return `M ${x1} ${y1} L ${medio - signoX * radio} ${y1}` +
                ` Q ${medio} ${y1} ${medio} ${y1 + signoY * radio}` +
                ` L ${medio} ${y2 - signoY * radio}` +
                ` Q ${medio} ${y2} ${medio + signoX * radio} ${y2}` +
                ` L ${x2} ${y2}`;

        }

        function rutaEnL(x1, y1, x2, y2, radioMax) {

            const dx = x2 - x1;
            const dy = y2 - y1;

            if (Math.abs(dx) < 2 || Math.abs(dy) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;

            const signoX = Math.sign(dx);
            const signoY = Math.sign(dy);
            const radio = Math.max(0, Math.min(radioMax, Math.abs(dx), Math.abs(dy)));

            return `M ${x1} ${y1} L ${x2 - signoX * radio} ${y1}` +
                ` Q ${x2} ${y1} ${x2} ${y1 + signoY * radio}` +
                ` L ${x2} ${y2}`;

        }

        function medir() {

            const base = contenedor.getBoundingClientRect();
            if (base.width === 0) return;

            lienzo.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);

            trazos.forEach(trazo => {

                if (!trazo.desde || !trazo.hasta) return;

                const a = trazo.desde.getBoundingClientRect();
                const b = trazo.hasta.getBoundingClientRect();

                if (a.height < 4 || b.height < 4) {
                    trazo.grupo.setAttribute('visibility', 'hidden');
                    return;
                }

                const vertical = b.top - a.bottom > 26;
                let x1, y1, x2, y2, puntos;

                if (trazo.lado) {

                    const derecha = trazo.lado === 'derecha';
                    const altoAncla = trazo.alturaFija || a.height;

                    x1 = (derecha ? a.right : a.left) - base.left;
                    y1 = a.top + altoAncla / 2 - base.top;
                    x2 = b.left + b.width / 2 - base.left;
                    y2 = b.top - base.top;

                    trazo.linea.setAttribute('d', rutaEnL(x1, y1, x2, y2, 16));
                    trazo.grupo.removeAttribute('visibility');
                    return;

                }

                if (vertical) {

                    x1 = a.left + a.width / 2 - base.left;
                    y1 = a.bottom - base.top;
                    x2 = b.left + b.width / 2 - base.left + (trazo.desplazamiento || 0);
                    y2 = b.top - base.top - 11;

                    if (y2 - y1 < 6) {
                        trazo.grupo.setAttribute('visibility', 'hidden');
                        return;
                    }

                    trazo.linea.setAttribute('d', rutaVertical(x1, y1, x2, y2));
                    puntos = `${x2 - 7},${y2 - 1} ${x2 + 7},${y2 - 1} ${x2},${y2 + 10}`;

                } else {

                    const haciaDerecha = (b.left + b.width / 2) > (a.left + a.width / 2);

                    x1 = (haciaDerecha ? a.right : a.left) - base.left;
                    y1 = a.top + a.height / 2 - base.top;
                    x2 = (haciaDerecha ? b.left - 11 : b.right + 11) - base.left;
                    y2 = b.top + b.height / 2 - base.top;

                    if (Math.abs(x2 - x1) < 10) {
                        trazo.grupo.setAttribute('visibility', 'hidden');
                        return;
                    }

                    trazo.linea.setAttribute('d', rutaHorizontal(x1, y1, x2, y2));

                    const punta = haciaDerecha ? x2 + 11 : x2 - 11;
                    puntos = `${x2},${y2 - 7} ${x2},${y2 + 7} ${punta},${y2}`;

                }

                trazo.grupo.removeAttribute('visibility');
                trazo.punta.setAttribute('points', puntos);

            });

        }

        function dibujar(claves) {
            trazos.forEach(trazo => {
                if (claves.includes(trazo.clave)) trazo.grupo.classList.add('dibujado');
            });
        }

        function limpiar() {
            trazos.forEach(trazo => trazo.grupo.classList.remove('dibujado'));
        }

        let siguiendo = false;
        let seguirHasta = 0;

        function seguir(duracion) {

            seguirHasta = Math.max(seguirHasta, performance.now() + duracion);
            if (siguiendo) return;
            siguiendo = true;

            function paso() {
                medir();
                if (performance.now() < seguirHasta) {
                    requestAnimationFrame(paso);
                } else {
                    siguiendo = false;
                }
            }

            requestAnimationFrame(paso);

        }

        if (window.ResizeObserver) {
            const vigilante = new ResizeObserver(() => medir());
            vigilante.observe(contenedor);
            pares.forEach(par => {
                if (par.desde) vigilante.observe(par.desde);
                if (par.hasta) vigilante.observe(par.hasta);
            });
        }

        window.addEventListener('resize', medir);
        window.addEventListener('load', medir);

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

        medir();

        return { medir, dibujar, limpiar, seguir };

    }


    let lineaTiempo = null;

    const contenedorTiempo = document.getElementById('lineaTiempo');
    const lienzoTiempo = document.getElementById('conectoresTiempo');

    if (contenedorTiempo && lienzoTiempo) {

        const tarjetas = [...contenedorTiempo.querySelectorAll('.tarjeta')];

        tarjetas.forEach((tarjeta, indice) => {
            tarjeta.dataset.paso = indice;
        });

        if (tarjetas.length > 1) {
            lineaTiempo = crearConectores(contenedorTiempo, lienzoTiempo, tarjetas.slice(0, -1).map((tarjeta, indice) => ({
                clave: 'paso' + indice,
                desde: tarjeta,
                hasta: tarjetas[indice + 1],
                lado: indice % 2 === 0 ? 'derecha' : 'izquierda',
                alturaFija: 497
            })));
        }

    }


    document.querySelectorAll('.grafico').forEach(grafico => {

        const columnas = [...grafico.querySelectorAll('.graficoColumna')];
        if (!columnas.length) return;

        const globo = crear('div', 'graficoGlobo');
        grafico.append(globo);

        columnas.forEach(columna => {

            const etiqueta = columna.getAttribute('aria-label') || '';
            const partes = etiqueta.split(':');
            const nombre = partes[0] || '';
            const dato = partes.length > 1 ? partes.slice(1).join(':').trim() : '';
            const esNegativa = columna.classList.contains('negativa');

            function mostrarGlobo() {

                globo.replaceChildren(
                    crear('strong', null, nombre),
                    crear('span', null, dato)
                );

                globo.classList.add('visible');
                globo.classList.toggle('abajo', esNegativa);

                const cajaGrafico = grafico.getBoundingClientRect();
                const cajaColumna = columna.getBoundingClientRect();

                const x = cajaColumna.left + cajaColumna.width / 2 - cajaGrafico.left;
                const y = esNegativa
                    ? cajaColumna.bottom - cajaGrafico.top
                    : cajaColumna.top - cajaGrafico.top;

                globo.style.left = x + 'px';
                globo.style.top = y + 'px';

            }

            function ocultarGlobo() {
                globo.classList.remove('visible');
            }

            columna.addEventListener('pointerenter', mostrarGlobo);
            columna.addEventListener('focus', mostrarGlobo);
            columna.addEventListener('pointerleave', ocultarGlobo);
            columna.addEventListener('blur', ocultarGlobo);
            columna.addEventListener('click', evento => {
                evento.stopPropagation();
                if (globo.classList.contains('visible')) ocultarGlobo();
                else mostrarGlobo();
            });

        });

        function dibujar() {
            columnas.forEach((columna, indice) => {
                window.setTimeout(() => {
                    columna.classList.add('dibujada');
                    const valor = columna.querySelector('.graficoValor');
                    if (valor && !sinMovimiento) window.setTimeout(() => animarContador(valor), 400);
                }, indice * 160);
            });
        }

        function reiniciar() {
            columnas.forEach(columna => columna.classList.remove('dibujada'));
        }

        const tarjetaGrafico = grafico.closest('.tarjeta');

        if (tarjetaGrafico) {
            tarjetaGrafico.addEventListener('tarjetaAbierta', dibujar);
            tarjetaGrafico.addEventListener('tarjetaCerrada', reiniciar);
        } else {
            dibujar();
        }

    });


    document.querySelectorAll('.donut').forEach(donut => {

        const etiqueta = donut.querySelector('[data-contador]');

        function dibujar() {
            donut.classList.add('dibujada');
            if (etiqueta && !sinMovimiento) window.setTimeout(() => animarContador(etiqueta), 300);
        }

        function reiniciar() {
            donut.classList.remove('dibujada');
        }

        const tarjetaDonut = donut.closest('.tarjeta');

        if (tarjetaDonut) {
            tarjetaDonut.addEventListener('tarjetaAbierta', dibujar);
            tarjetaDonut.addEventListener('tarjetaCerrada', reiniciar);
        } else {
            dibujar();
        }

        const rotulo = donut.getAttribute('aria-label') || '';
        const partes = rotulo.split(':');
        const nombre = partes[0] || '';
        const dato = partes.length > 1 ? partes.slice(1).join(':').trim() : '';

        const globo = crear('div', 'graficoGlobo');
        donut.append(globo);

        function mostrarGlobo() {

            globo.replaceChildren(
                crear('strong', null, nombre),
                crear('span', null, dato)
            );

            globo.classList.add('visible');

            const cajaDonut = donut.getBoundingClientRect();
            const cajaArco = donut.querySelector('.donutValor').getBoundingClientRect();

            const x = cajaArco.left + cajaArco.width / 2 - cajaDonut.left;
            const y = cajaArco.top - cajaDonut.top;

            globo.style.left = x + 'px';
            globo.style.top = y + 'px';

        }

        function ocultarGlobo() {
            globo.classList.remove('visible');
        }

        donut.addEventListener('pointerenter', mostrarGlobo);
        donut.addEventListener('focus', mostrarGlobo);
        donut.addEventListener('pointerleave', ocultarGlobo);
        donut.addEventListener('blur', ocultarGlobo);
        donut.addEventListener('click', evento => {
            evento.stopPropagation();
            if (globo.classList.contains('visible')) ocultarGlobo();
            else mostrarGlobo();
        });

    });



    document.addEventListener('click', () => {
        document.querySelectorAll('.graficoGlobo.visible').forEach(globo => globo.classList.remove('visible'));
    });


    document.querySelectorAll('.user').forEach(grupo => {
        [...grupo.children].forEach((icono, indice) => {
            icono.style.setProperty('--indice', indice);
        });
    });

    document.querySelectorAll('.contenedorTarjetas').forEach(contenedor => {
        [...contenedor.querySelectorAll(':scope > [data-revelar]')].forEach((hijo, indice) => {
            hijo.style.setProperty('--retraso', ((indice % 2) * 130) + 'ms');
        });
    });

    document.querySelectorAll('.contenedorTarjetas2').forEach(contenedor => {
        [...contenedor.querySelectorAll(':scope > [data-revelar]')].forEach((hijo, indice) => {
            hijo.style.setProperty('--retraso', (indice * 110) + 'ms');
        });
    });


    const revelables = document.querySelectorAll('[data-revelar]');

    function revelar(elemento) {

        elemento.classList.add('visible');

        elemento.addEventListener('animationend', evento => {
            if (evento.target !== elemento) return;
            elemento.classList.add('listo');
        });

        if (elemento.dataset.contador) animarContador(elemento);
        elemento.querySelectorAll('[data-contador]').forEach(contador => {
            if (contador.closest('.tarjetaDetalle')) return;
            animarContador(contador);
        });

        if (lineaTiempo && elemento.dataset.paso !== undefined) {
            const indice = parseInt(elemento.dataset.paso, 10);
            if (indice > 0) {
                lineaTiempo.seguir(1000);
                window.setTimeout(() => lineaTiempo.dibujar(['paso' + (indice - 1)]), 120);
            }
        }

    }

    if (sinMovimiento) {

        revelables.forEach(elemento => elemento.classList.add('visible', 'listo'));
        document.querySelectorAll('.graficoColumna').forEach(columna => columna.classList.add('dibujada'));
        document.querySelectorAll('.donut').forEach(donut => donut.classList.add('dibujada'));
        if (lineaTiempo) lineaTiempo.dibujar(['paso0', 'paso1', 'paso2', 'paso3', 'paso4']);

    } else {

        const observador = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (!entrada.isIntersecting) return;
                revelar(entrada.target);
                observador.unobserve(entrada.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

        revelables.forEach(elemento => observador.observe(elemento));

    }


    const capas = document.querySelectorAll('[data-parallax]');
    const barraProgreso = document.getElementById('barraProgreso');
    const subir = document.getElementById('subir');
    let pendiente = false;

    function actualizar() {

        const desplazamiento = window.scrollY;

        if (!sinMovimiento) {
            capas.forEach(capa => {
                const factor = parseFloat(capa.dataset.parallax) || 0;
                capa.style.setProperty('--desplazamiento', (desplazamiento * factor).toFixed(1) + 'px');
            });
        }

        if (barraProgreso) {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            const avance = total > 0 ? (desplazamiento / total) * 100 : 0;
            barraProgreso.style.width = Math.min(avance, 100) + '%';
        }

        if (subir) {
            subir.classList.toggle('visible', desplazamiento > window.innerHeight * 0.8);
        }

        pendiente = false;

    }

    window.addEventListener('scroll', () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(actualizar);
    }, { passive: true });

    actualizar();

    if (subir) {
        subir.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: sinMovimiento ? 'auto' : 'smooth' });
        });
    }


    document.querySelectorAll('.tarjeta').forEach(tarjeta => {

        const flecha = tarjeta.querySelector('.tarjetaFlecha');
        const textoFlecha = tarjeta.querySelector('.tarjetaFlechaTexto');
        const etiqueta = tarjeta.dataset.etiqueta ? ' ' + tarjeta.dataset.etiqueta : '';

        function alternar() {

            const yaAbierta = tarjeta.classList.contains('abierta');

            if (!yaAbierta) {
                document.querySelectorAll('.tarjeta.abierta').forEach(otra => {
                    if (otra === tarjeta) return;
                    otra.classList.remove('abierta');
                    const otraFlecha = otra.querySelector('.tarjetaFlecha');
                    const otraTexto = otra.querySelector('.tarjetaFlechaTexto');
                    const otraEtiqueta = otra.dataset.etiqueta ? ' ' + otra.dataset.etiqueta : '';
                    if (otraFlecha) otraFlecha.setAttribute('aria-expanded', 'false');
                    if (otraTexto) otraTexto.textContent = 'Ver más' + otraEtiqueta;
                    otra.dispatchEvent(new CustomEvent('tarjetaCerrada', { bubbles: true }));
                });
            }

            const abierta = tarjeta.classList.toggle('abierta');
            if (flecha) flecha.setAttribute('aria-expanded', String(abierta));
            if (textoFlecha) textoFlecha.textContent = (abierta ? 'Ver menos' : 'Ver más') + etiqueta;
            if (lineaTiempo) lineaTiempo.seguir(800);

            if (abierta) {
                tarjeta.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'nearest' });
                tarjeta.dispatchEvent(new CustomEvent('tarjetaAbierta', { bubbles: true }));
            } else {
                tarjeta.dispatchEvent(new CustomEvent('tarjetaCerrada', { bubbles: true }));
            }
        }

        tarjeta.addEventListener('click', evento => {
            if (evento.target.closest('a')) return;
            if (evento.target.closest('.tarjetaFlecha')) return;
            if (evento.target.closest('.miniaturaImg')) return;
            alternar();
        });

        if (flecha) {
            flecha.addEventListener('click', evento => {
                evento.stopPropagation();
                alternar();
            });
        }

        if (!conPuntero || sinMovimiento) return;

        tarjeta.addEventListener('pointermove', evento => {
            const caja = tarjeta.getBoundingClientRect();
            const x = (evento.clientX - caja.left) / caja.width;
            const y = (evento.clientY - caja.top) / caja.height;
            tarjeta.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            tarjeta.style.setProperty('--my', (y * 100).toFixed(1) + '%');
            if (tarjeta.closest('#lineaTiempo') || tarjeta.classList.contains('tarjeta3')) return;
            tarjeta.style.setProperty('--ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
            tarjeta.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        });

        if (tarjeta.closest('#lineaTiempo') && lineaTiempo) {
            tarjeta.addEventListener('pointerenter', () => lineaTiempo.seguir(450));
            tarjeta.addEventListener('pointerleave', () => lineaTiempo.seguir(450));
        }

        tarjeta.addEventListener('pointerleave', () => {
            tarjeta.style.setProperty('--rx', '0deg');
            tarjeta.style.setProperty('--ry', '0deg');
        });

    });


    const tarjetaDato = document.getElementById('tarjetaDato');
    const waffle = document.getElementById('waffle');

    if (tarjetaDato && waffle) {

        const iconos = [...waffle.children];

        iconos.forEach((icono, indice) => {
            icono.style.setProperty('--indice', indice);
        });

        iconos.forEach(icono => {
            icono.addEventListener('animationend', evento => {
                if (evento.target !== icono || evento.animationName !== 'aparecerIcono') return;
                icono.classList.add('puesto');
            });
        });

        function resaltar(grupo) {
            if (!grupo) {
                delete waffle.dataset.resaltado;
                return;
            }
            waffle.dataset.resaltado = grupo;
        }

        function reproducir() {
            tarjetaDato.classList.add('visible');
            const numero = tarjetaDato.querySelector('[data-contador]');
            if (numero && !sinMovimiento) animarContador(numero);
        }

        function reiniciar() {
            tarjetaDato.classList.remove('visible');
            iconos.forEach(icono => icono.classList.remove('puesto'));
            ocultarGloboIcono();
        }

        waffle.addEventListener('pointerover', evento => {
            const icono = evento.target.closest('.usuario');
            if (!icono) return;
            resaltar(icono.dataset.grupo);
            mostrarGloboIcono(icono.dataset.grupo);
        });

        waffle.addEventListener('pointerleave', () => {
            resaltar(null);
            ocultarGloboIcono();
        });

        waffle.addEventListener('click', evento => {
            const icono = evento.target.closest('.usuario');
            if (!icono) return;
            evento.stopPropagation();
            resaltar(waffle.dataset.resaltado === icono.dataset.grupo ? null : icono.dataset.grupo);
        });

        tarjetaDato.addEventListener('click', reproducir);

        const tarjetaWaffle = tarjetaDato.closest('.tarjeta');
        if (tarjetaWaffle) {
            tarjetaWaffle.addEventListener('tarjetaAbierta', reproducir);
            tarjetaWaffle.addEventListener('tarjetaCerrada', reiniciar);
        }

        const globo = crear('div', 'graficoGlobo globoIcono');
        waffle.append(globo);

        let grupoMostrado = null;

        function calcularPosicionGrupo(grupo) {

            const cajaWaffle = waffle.getBoundingClientRect();
            const iconosGrupo = iconos.filter(icono => icono.dataset.grupo === grupo);

            let minX = Infinity, maxX = -Infinity, minY = Infinity;
            iconosGrupo.forEach(icono => {
                const caja = icono.getBoundingClientRect();
                minX = Math.min(minX, caja.left);
                maxX = Math.max(maxX, caja.right);
                minY = Math.min(minY, caja.top);
            });

            return {
                x: (minX + maxX) / 2 - cajaWaffle.left,
                y: minY - cajaWaffle.top
            };

        }

        function mostrarGloboIcono(grupo) {

            if (grupo !== grupoMostrado) {
                const afectado = grupo === 'afectado';
                globo.replaceChildren(
                    crear('strong', null, afectado ? 'Perdió encargos' : 'No perdió encargos'),
                    crear('span', null, 'por alternativas de IA')
                );
                grupoMostrado = grupo;
            }

            globo.classList.add('visible');
            globo.classList.remove('abajo');

            const posicion = calcularPosicionGrupo(grupo);
            globo.style.left = posicion.x + 'px';
            globo.style.top = posicion.y + 'px';

        }

        function ocultarGloboIcono() {
            globo.classList.remove('visible');
            grupoMostrado = null;
        }

    }


    const flujo = document.getElementById('flujo');
    const lienzoFlujo = document.getElementById('conectores');
    const nodoInicial = document.getElementById('nodoInicial');
    const ramas = document.getElementById('ramas');
    const nivelFinal = document.getElementById('nivelFinal');
    const nodoFinal = document.getElementById('nodoFinal');
    const nodosRama = [...document.querySelectorAll('.nodoRama')];

    if (!flujo || !lienzoFlujo || !nodoInicial || nodosRama.length < 2) return;

    const sistemaFlujo = crearConectores(flujo, lienzoFlujo, [
        { clave: 'ramaVerde', desde: nodoInicial, hasta: nodosRama[0] },
        { clave: 'ramaRoja', desde: nodoInicial, hasta: nodosRama[1] },
        { clave: 'finalVerde', desde: nodosRama[0], hasta: nodoFinal, desplazamiento: -135 },
        { clave: 'finalRoja', desde: nodosRama[1], hasta: nodoFinal, desplazamiento: 135 }
    ]);

    let ramasReveladas = 0;
    let temporizadoresFlujo = [];

    function tempo(fn, ms) {
        const id = window.setTimeout(fn, ms);
        temporizadoresFlujo.push(id);
        return id;
    }

    function reproducirFlujo() {

        ramas.classList.add('visible');
        nodoInicial.classList.add('activado');

        sistemaFlujo.seguir(900);
        tempo(() => sistemaFlujo.dibujar(['ramaVerde', 'ramaRoja']), 90);

        // La transición de "ramas" (grid-template-rows) tarda 0.65s (ver --suave en CSS).
        // Se usa un setTimeout en lugar de 'transitionend' porque ese evento puede no
        // dispararse en todos los navegadores para grid-template-rows, dejando colgada
        // el resto de la animación (nodo 87%, flechas finales y descripciones).
        tempo(() => {

            ramas.classList.add('abierto');
            sistemaFlujo.medir();

            nodosRama.forEach((nodo, indice) => {
                tempo(() => {

                    nodo.classList.add('revelado');
                    ramasReveladas++;
                    sistemaFlujo.seguir(800);

                    if (ramasReveladas < nodosRama.length) return;

                    nivelFinal.classList.add('visible');
                    sistemaFlujo.seguir(1100);
                    tempo(() => sistemaFlujo.dibujar(['finalVerde', 'finalRoja']), 90);
                    tempo(() => nivelFinal.classList.add('abierto'), 650);

                    const contador = nodoFinal.querySelector('[data-contador]');
                    if (contador) tempo(() => animarContador(contador), 420);

                }, indice * 250);
            });

        }, 650);

    }

    function reiniciarFlujo() {

        temporizadoresFlujo.forEach(id => window.clearTimeout(id));
        temporizadoresFlujo = [];
        ramasReveladas = 0;

        ramas.classList.remove('visible', 'abierto');
        nodoInicial.classList.remove('activado');
        nodosRama.forEach(nodo => nodo.classList.remove('revelado'));
        nivelFinal.classList.remove('visible', 'abierto');
        sistemaFlujo.limpiar();

    }

    const tarjetaFlujo = flujo.closest('.tarjeta');

    function observarFlujo() {

        if (sinMovimiento) {
            reproducirFlujo();
            return;
        }

        const observador = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (!entrada.isIntersecting) return;
                reproducirFlujo();
                observador.disconnect();
            });
        }, { threshold: 0.35 });

        observador.observe(flujo);

    }

    if (tarjetaFlujo) {
        tarjetaFlujo.addEventListener('tarjetaAbierta', observarFlujo);
        tarjetaFlujo.addEventListener('tarjetaCerrada', reiniciarFlujo);
    } else {
        observarFlujo();
    }


    const lbFondo = document.querySelector('.lbFondo');
    const lbCaja = document.querySelector('.lbCaja');

    function cerrarLightbox() {
        if (!lbFondo || !lbCaja) return;
        lbFondo.classList.remove('activo');
        lbFondo.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        lbCaja.innerHTML = '';
    }

    function abrirLightbox(idPlantilla, indiceInicial) {

        const plantilla = document.getElementById(idPlantilla);
        if (!plantilla || !lbFondo || !lbCaja) return;

        lbCaja.innerHTML = '';
        lbCaja.appendChild(plantilla.content.cloneNode(true));

        const cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.className = 'lbCerrar';
        cerrar.setAttribute('aria-label', 'Cerrar imagen ampliada');
        cerrar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icoX"/></svg>';
        cerrar.addEventListener('click', cerrarLightbox);
        lbCaja.appendChild(cerrar);

        const paginas = [...lbCaja.querySelectorAll('.lbSlide')];

        if (paginas.length) {

            let indice = indiceInicial || 0;

            function mostrar(i) {
                indice = (i + paginas.length) % paginas.length;
                paginas.forEach((pagina, idx) => pagina.classList.toggle('activo', idx === indice));
            }

            mostrar(indice);

            const anterior = lbCaja.querySelector('.lbFlechaPrev');
            const siguiente = lbCaja.querySelector('.lbFlechaNext');

            if (anterior) anterior.addEventListener('click', () => mostrar(indice - 1));
            if (siguiente) siguiente.addEventListener('click', () => mostrar(indice + 1));

        }

        lbFondo.classList.add('activo');
        lbFondo.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';

    }

    document.querySelectorAll('.galeria[data-lightbox]').forEach(galeria => {
        const idPlantilla = galeria.dataset.lightbox;
        [...galeria.querySelectorAll('.miniaturaImg')].forEach((boton, indice) => {
            boton.addEventListener('click', () => abrirLightbox(idPlantilla, indice));
        });
    });

    if (lbFondo) {
        lbFondo.addEventListener('click', evento => {
            if (evento.target === lbFondo) cerrarLightbox();
        });
    }

    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') cerrarLightbox();
    });

});