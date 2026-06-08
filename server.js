import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arquivoDados = path.join(__dirname, "atestados.json");

const SENHA_ADMIN = "GS3MkTFW3A";
let adminLogado = false;

function carregarAtestados() {
  if (!fs.existsSync(arquivoDados)) {
    fs.writeFileSync(arquivoDados, "[]");
  }

  const dados = fs.readFileSync(arquivoDados, "utf-8");
  return JSON.parse(dados);
}

function salvarAtestados(atestados) {
  fs.writeFileSync(
    arquivoDados,
    JSON.stringify(atestados, null, 2)
  );
}

function gerarToken(atestados) {
  const numero = atestados.length + 1;
  return "ATT-" + String(numero).padStart(3, "0");
}

function gerarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const server = http.createServer((req, res) => {

  if (req.url === "/style.css") {
    fs.readFile(path.join(__dirname, "style.css"), (err, data) => {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(data);
    });
    return;
  }

  if (req.url === "/lab.jpg") {
    fs.readFile(path.join(__dirname, "public", "lab.jpg"), (err, data) => {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(data);
    });
    return;
  }

  if (req.url === "/login") {
    fs.readFile(path.join(__dirname, "login.html"), (err, data) => {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });
      res.end(data);
    });
    return;
  }

  if (req.url.startsWith("/entrar")) {
    let corpo = "";

    req.on("data", parte => {
      corpo += parte.toString();
    });

    req.on("end", () => {
      const dados = new URLSearchParams(corpo);
      const senha = dados.get("senha");

      if (senha === SENHA_ADMIN) {
        adminLogado = true;

        res.writeHead(302, {
          Location: "/admin"
        });

        res.end();
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      res.end(`
        <h1>Senha incorreta</h1>
        <p><a href="/login">Tentar novamente</a></p>
      `);
    });

    return;
  }

  if (req.url === "/admin") {
    if (!adminLogado) {
      res.writeHead(302, {
        Location: "/login"
      });

      res.end();
      return;
    }

    fs.readFile(path.join(__dirname, "admin.html"), (err, data) => {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });
      res.end(data);
    });

    return;
  }

  if (req.url.startsWith("/criar")) {
    const url = new URL(req.url, "https://atestado-qr.onrender.com");

    const atestados = carregarAtestados();
    const token = gerarToken(atestados);

    const novoAtestado = {
      token,
      nome: url.searchParams.get("nome"),
      cpf: url.searchParams.get("cpf"),
      nascimento: url.searchParams.get("nascimento"),
      medico: url.searchParams.get("medico"),
      crm: url.searchParams.get("crm"),
      afastamento: url.searchParams.get("afastamento"),
      emitido: new Date().toLocaleString("pt-BR"),
      codigo: gerarCodigo()
    };

    atestados.push(novoAtestado);
    salvarAtestados(atestados);
        res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Atestado Criado</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <div class="topo">
            <img src="/lab.jpg" class="logo">
            <h1>Atestado Criado</h1>
            <div class="status">✅ CADASTRADO COM SUCESSO</div>
            <p class="texto">Token gerado: ${token}</p>
          </div>

          <div class="card dados">
            <h2>Link de validação</h2>
            <p>https://atestado-qr.onrender.com/validar?token=${token}</p>

            <h2>QR Code</h2>
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://atestado-qr.onrender.com/validar?token=${token}" 
              width="220"
            >
          </div>
        </div>
      </body>
      </html>
    `);

    return;
  }

  if (req.url === "/lista") {
    const atestados = carregarAtestados();

    let itens = "";

    atestados.forEach((atestado) => {
      itens += `
        <div class="card dados">
          <h2>${atestado.token}</h2>
          <p>Nome: ${atestado.nome}</p>
          <p>CPF: ${atestado.cpf}</p>
          <p>Emitido em: ${atestado.emitido}</p>

          <p>
            <a href="/validar?token=${atestado.token}">
              Abrir validação
            </a>
          </p>

          <p>
            <a href="/excluir?token=${atestado.token}">
              🗑️ Excluir atestado
            </a>
          </p>
        </div>
      `;
    });

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Lista de Atestados</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <div class="topo">
            <img src="/lab.jpg" class="logo">
            <h1>Lista de Atestados</h1>
            <p class="texto">Todos os atestados cadastrados.</p>
          </div>

          ${itens}
        </div>
      </body>
      </html>
    `);

    return;
  }

  if (req.url.startsWith("/excluir")) {
    const url = new URL(req.url, "https://atestado-qr.onrender.com");
    const token = url.searchParams.get("token");

    let atestados = carregarAtestados();

    atestados = atestados.filter(
      item => item.token !== token
    );

    salvarAtestados(atestados);

    res.writeHead(302, {
      Location: "/lista"
    });

    res.end();

    return;
  }

  if (req.url.startsWith("/validar")) {
    const url = new URL(req.url, "https://atestado-qr.onrender.com");
    const token = url.searchParams.get("token");

    const atestados = carregarAtestados();

    const atestado = atestados.find(
      item => item.token === token
    );

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    if (!atestado) {
      res.end(`
        <h1>Documento inválido</h1>
        <p>Token não encontrado.</p>
      `);
      return;
    }

    res.end(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Documento Válido</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>

        <div class="container">

          <div class="topo">
            <img src="/lab.jpg" class="logo">
            <h1>Resultado da Validação</h1>
            <div class="status">✅ DOCUMENTO VÁLIDO</div>
            <p class="texto">Token verificado com sucesso.</p>
          </div>

          <div class="card dados">
            <h2>Dados do Paciente</h2>
            <p>Nome: ${atestado.nome}</p>
            <p>CPF: ${atestado.cpf}</p>
            <p>Data de Nascimento: ${atestado.nascimento}</p>
          </div>

          <div class="card dados">
            <h2>Dados do Atestado</h2>
            <p>Emitido em: ${atestado.emitido}</p>
            <p>Afastamento: ${atestado.afastamento}</p>
            <p>Código de acesso: ${atestado.codigo}</p>
            <p>Token: ${token}</p>
          </div>

          <div class="card dados">
            <h2>Dados do Médico</h2>
            <p>Nome: ${atestado.medico}</p>
            <p>CRM: ${atestado.crm}</p>
          </div>

        </div>

      </body>
      </html>
    `);

    return;
  }

  fs.readFile(
    path.join(__dirname, "index.html"),
    (err, data) => {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      res.end(data);
    }
  );

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});