const text = "whoami";
const typingElement = document.getElementById("typing");

let index = 0;

function typeText() {

    if (index < text.length) {

        typingElement.textContent += text.charAt(index);

        index++;

        setTimeout(typeText, 100);
    }
}

typeText();

/* =========================
   Scroll Reveal
========================= */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("active");

                revealObserver.unobserve(entry.target);
            }

        });

    },
    {
        threshold: 0.15
    }
);


revealElements.forEach((element) => {

    revealObserver.observe(element);

});


/* =========================
   Active Navigation
========================= */

const sections = document.querySelectorAll(
    "#about, #projects, #skills, #contact"
);

const navLinks = document.querySelectorAll(".nav-links a");


const navObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                const sectionId = entry.target.id;

                navLinks.forEach((link) => {

                    link.classList.remove("active");

                    if (link.getAttribute("href") === `#${sectionId}`) {
                        link.classList.add("active");
                    }

                });

            }

        });

    },
    {
        rootMargin: "-35% 0px -55% 0px"
    }
);


sections.forEach((section) => {
    navObserver.observe(section);
});

/* =========================
   Animated Terminal
========================= */

const terminalCommand = document.getElementById("terminal-command");
const terminalOutput = document.getElementById("terminal-output");

const terminalSequence = [
    {
        command: "whoami",
        output: "brandon"
    },
    {
        command: "cat skills.txt",
        output: "Linux\nOffensive Security\nDetection Engineering\nSIEM / SOAR"
    },
    {
        command: "ls projects/",
        output: "connected/\nwazuh-soar/\nsentinel-honeypot/"
    },
    {
        command: "cat status.txt",
        output: "SYSTEM ONLINE\nCURRENT MODE: BUILDING"
    }
];

let terminalSequenceIndex = 0;
let terminalCharIndex = 0;


function typeTerminalCommand() {

    const currentItem = terminalSequence[terminalSequenceIndex];

    if (terminalCharIndex < currentItem.command.length) {

        terminalCommand.textContent +=
            currentItem.command.charAt(terminalCharIndex);

        terminalCharIndex++;

        setTimeout(typeTerminalCommand, 70);

    } else {

        setTimeout(() => {
            showTerminalOutput(currentItem);
        }, 400);

    }

}


function showTerminalOutput(item) {

    const commandLine = document.createElement("p");

    commandLine.innerHTML =
        `<span class="terminal-green">brandon@cyber</span>:~$ ${item.command}`;


    const outputLine = document.createElement("p");

    outputLine.classList.add("terminal-output");

    outputLine.textContent = item.output;


    terminalOutput.appendChild(commandLine);
    terminalOutput.appendChild(outputLine);

    while (terminalOutput.children.length > 6) {
        terminalOutput.removeChild(terminalOutput.firstChild);
    }


    terminalCommand.textContent = "";

    terminalCharIndex = 0;

    terminalSequenceIndex++;


    if (terminalSequenceIndex >= terminalSequence.length) {
        terminalSequenceIndex = 0;
    }


    setTimeout(typeTerminalCommand, 900);
}


typeTerminalCommand();

/* =========================
   Floating Network Background
========================= */

const networkCanvas = document.getElementById("network-bg");
const networkCtx = networkCanvas.getContext("2d");

let networkNodes = [];


/* Number of floating circles */
const nodeCount = 7;


/* Resize canvas */
function resizeNetworkCanvas() {

    networkCanvas.width = window.innerWidth;
    networkCanvas.height = window.innerHeight;

}


/* Create nodes */
function createNetworkNodes() {

    networkNodes = [];

    for (let i = 0; i < nodeCount; i++) {

        networkNodes.push({

            x: Math.random() * networkCanvas.width,
            y: Math.random() * networkCanvas.height,

            radius: Math.random() * 2 + 2,

            velocityX:
                (Math.random() - 0.5) * 0.38,

            velocityY:
                (Math.random() - 0.5) * 0.38

        });

    }

}


/* Draw glowing node */
function drawNetworkNode(node) {

    const glow = networkCtx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        25
    );

    glow.addColorStop(
        0,
        "rgba(0, 255, 156, 0.35)"
    );

    glow.addColorStop(
        0.25,
        "rgba(0, 255, 156, 0.12)"
    );

    glow.addColorStop(
        1,
        "rgba(0, 255, 156, 0)"
    );


    networkCtx.beginPath();

    networkCtx.arc(
        node.x,
        node.y,
        25,
        0,
        Math.PI * 2
    );

    networkCtx.fillStyle = glow;

    networkCtx.fill();


    /* Center circle */

    networkCtx.beginPath();

    networkCtx.arc(
        node.x,
        node.y,
        node.radius,
        0,
        Math.PI * 2
    );

    networkCtx.fillStyle =
        "rgba(0, 255, 156, 0.55)";

    networkCtx.fill();

}


/* Connect two nodes */
function connectNodes(first, second) {

    networkCtx.beginPath();

    networkCtx.moveTo(
        first.x,
        first.y
    );

    networkCtx.lineTo(
        second.x,
        second.y
    );

    networkCtx.strokeStyle =
        "rgba(0, 255, 156, 0.10)";

    networkCtx.lineWidth = 1;

    networkCtx.stroke();

}


/* Animation */
function animateNetwork() {

    networkCtx.clearRect(
        0,
        0,
        networkCanvas.width,
        networkCanvas.height
    );


    networkNodes.forEach((node) => {

        node.x += node.velocityX;
        node.y += node.velocityY;


        /* Bounce from edges */

        if (
            node.x < 0 ||
            node.x > networkCanvas.width
        ) {

            node.velocityX *= -1;

        }


        if (
            node.y < 0 ||
            node.y > networkCanvas.height
        ) {

            node.velocityY *= -1;

        }


        drawNetworkNode(node);

    });


    /*
       Only two connections.
       Keeps it from becoming a busy
       particle-network effect.
    */

    if (networkNodes.length >= 4) {

        connectNodes(
            networkNodes[0],
            networkNodes[1]
        );

        connectNodes(
            networkNodes[2],
            networkNodes[3]
        );

    }


    requestAnimationFrame(
        animateNetwork
    );

}


window.addEventListener(
    "resize",
    resizeNetworkCanvas
);


resizeNetworkCanvas();
createNetworkNodes();
animateNetwork();