// ===== Liminale — Three.js =====
// Il codice è solo la superficie.

// ----- BLOCCO 1: SETUP -----

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x111111, 0.04);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Luce ambiente fissa, luce direzionale risponde alla tensione
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(3, 5, 4);
scene.add(directionalLight);

const clock = new THREE.Clock();


// ----- BLOCCO 2: MEMORIA E TENDENZA -----

const MEMORIA_MAX = 80;      // quante direzioni ricordiamo
const SOGLIA_TENSIONE = 4.0; // soglia che scatta l'evento

const memoria = [];          // ogni elemento: { x, y }
const tendenza = { x: 0, y: 0 };
let tensione = 0;

function aggiornaMemoria(dx, dy) {
    memoria.push({ x: dx, y: dy });
    if (memoria.length > MEMORIA_MAX) memoria.shift();

    // Media pesata: le direzioni recenti contano di più
    let sumX = 0, sumY = 0, sumPeso = 0;
    memoria.forEach((dir, i) => {
        const peso = (i + 1) / memoria.length;
        sumX += dir.x * peso;
        sumY += dir.y * peso;
        sumPeso += peso;
    });
    tendenza.x = sumX / sumPeso;
    tendenza.y = sumY / sumPeso;
}


// ----- BLOCCO 3: TENSIONE -----

// La tensione è quanto la direzione corrente diverge dalla tendenza accumulata.
// Sale quando vai contro la storia della stanza. Decade lentamente.

function aggiornaTensione(dx, dy) {
    const divergenzaX = dx - tendenza.x;
    const divergenzaY = dy - tendenza.y;
    const divergenza = Math.sqrt(divergenzaX * divergenzaX + divergenzaY * divergenzaY);
    tensione += divergenza * 0.22;
    tensione *= 0.96; // decadimento: la stanza dimentica lentamente
}


// ----- BLOCCO 4: PRESENZE -----

const NUM_PRESENZE = 7;
const presenze = [];

for (let i = 0; i < NUM_PRESENZE; i++) {
    const radius = Math.random() * 0.3 + 0.12;
    const geometry = new THREE.IcosahedronGeometry(radius, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18 + Math.random() * 0.18,
        roughness: 0.9,
        metalness: 0.05,
        wireframe: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 3
    );
    mesh.userData = {
        peso: 0.4 + Math.random() * 0.6,  // quanto questa presenza risponde alla tendenza
        velRot: new THREE.Vector3(
            (Math.random() - 0.5) * 0.004,
            (Math.random() - 0.5) * 0.004,
            0
        ),
        targetPos: null,
        inTransizione: false
    };
    scene.add(mesh);
    presenze.push(mesh);
}


// ----- BLOCCO 5: EVENTO -----

let inEvento = false;
let tempoEvento = 0;
const DURATA_EVENTO = 3.0; // secondi

function scattaEvento() {
    if (inEvento) return;
    inEvento = true;
    tempoEvento = 0;

    // La memoria si azzera: la stanza ha cambiato forma
    memoria.length = 0;
    tendenza.x = 0;
    tendenza.y = 0;
    tensione = 0;

    // Flash visibile + camera shake
    flash.style.transition = 'opacity 0.08s ease-in';
    flash.style.opacity = '0.25';
    setTimeout(() => {
        flash.style.transition = 'opacity 1.2s ease-out';
        flash.style.opacity = '0';
    }, 80);
    shakeIntensity = 0.18;

    // Ogni presenza riceve un nuovo target silenzioso
    presenze.forEach(p => {
        p.userData.targetPos = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 3
        );
        p.userData.inTransizione = true;
    });
}


// ----- FLASH EVENTO -----

const flash = document.createElement('div');
flash.style.cssText = `
    position: absolute;
    inset: 0;
    background: white;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.08s ease-in;
`;
document.body.appendChild(flash);

let shakeIntensity = 0;

let mouseX = 0, mouseY = 0;
let lastMouseX = 0, lastMouseY = 0;

document.addEventListener('mousemove', event => {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 10;
    mouseY = -(event.clientY / window.innerHeight - 0.5) * 10;
});


// ----- UI MINIMA -----

// Titolo in basso a destra, quasi invisibile
const titolo = document.createElement('div');
titolo.innerText = "Liminale";
titolo.style.cssText = `
    position: absolute;
    bottom: 28px;
    right: 32px;
    font-family: 'Georgia', serif;
    color: white;
    opacity: 0.15;
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    pointer-events: none;
`;
document.body.appendChild(titolo);

// Linea di tensione: quasi invisibile sul bordo inferiore.
// Non è una progress bar. È una soglia.
const lineaTensione = document.createElement('div');
lineaTensione.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 1px;
    background: white;
    width: 0%;
    opacity: 0.12;
    pointer-events: none;
`;
document.body.appendChild(lineaTensione);


// ----- LOOP -----

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Delta mouse: la direzione del movimento in questo frame
    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    // Aggiorna memoria e tensione solo se c'è movimento reale
    if (Math.abs(dx) + Math.abs(dy) > 0.002) {
        aggiornaMemoria(dx, dy);
        aggiornaTensione(dx, dy);
    }

    // Controlla soglia evento
    if (tensione > SOGLIA_TENSIONE && !inEvento) {
        scattaEvento();
    }

    // Avanza evento
    if (inEvento) {
        tempoEvento += delta;
        if (tempoEvento > DURATA_EVENTO) {
            inEvento = false;
            presenze.forEach(p => { p.userData.inTransizione = false; });
        }
    }

    // Repulsione tra presenze: nessuna si sovrappone all'altra
    for (let i = 0; i < presenze.length; i++) {
        for (let j = i + 1; j < presenze.length; j++) {
            const a = presenze[i];
            const b = presenze[j];
            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dz = a.position.z - b.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.001;
            if (dist < 1.8) {
                const forza = (1.8 - dist) * 0.008;
                const nx = dx / dist, ny = dy / dist, nz = dz / dist;
                a.position.x += nx * forza;
                a.position.y += ny * forza;
                a.position.z += nz * forza;
                b.position.x -= nx * forza;
                b.position.y -= ny * forza;
                b.position.z -= nz * forza;
            }
        }
    }

    // Aggiorna ogni presenza
    presenze.forEach(p => {
        if (p.userData.inTransizione && p.userData.targetPos) {
            // Evento: si muovono verso il nuovo target
            // La velocità è lenta — non è un salto, è uno scivolamento
            p.position.lerp(p.userData.targetPos, 0.035);
        } else {
            // Stato normale: deriva nella direzione della tendenza
            // Ogni presenza ha un peso diverso — alcune resistono, altre seguono
            p.position.x += tendenza.x * p.userData.peso * 0.0008;
            p.position.y += tendenza.y * p.userData.peso * 0.0008;

            // Contenimento elastico: bordi morbidi che respingono
            const LIMITE = 4.5;
            if (Math.abs(p.position.x) > LIMITE)
                p.position.x -= Math.sign(p.position.x) * 0.02;
            if (Math.abs(p.position.y) > LIMITE)
                p.position.y -= Math.sign(p.position.y) * 0.02;
            if (Math.abs(p.position.z) > 2.5)
                p.position.z -= Math.sign(p.position.z) * 0.01;
        }

        // Rotazione individuale lenta
        p.rotation.x += p.userData.velRot.x;
        p.rotation.y += p.userData.velRot.y;
    });

    // La luce risponde alla tensione: più conflitto, più luce
    directionalLight.intensity = 0.4 + Math.min(tensione * 0.15, 1.2);

    // La nebbia risponde alla tensione: più conflitto, più opacità
    scene.fog.density = 0.035 + Math.min(tensione * 0.006, 0.04);

    // Camera segue il mouse — il range è limitato, non si perde nella scena
    camera.position.x += (mouseX * 0.25 - camera.position.x) * 0.04;
    camera.position.y += (mouseY * 0.25 - camera.position.y) * 0.04;

    // Shake: decade rapidamente dopo l'evento
    if (shakeIntensity > 0.001) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.88;
    }

    camera.lookAt(scene.position);

    // Linea di tensione
    const percentuale = Math.min((tensione / SOGLIA_TENSIONE) * 100, 100);
    lineaTensione.style.width = percentuale + '%';

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
