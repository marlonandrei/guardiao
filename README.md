# GUARDIÃO #

O projeto guardião é um assistente virtual inteligente que monitora máquinas e equipamentos de forma preditiva, evitando riscos e acidentes na indústria. 

### O Problema ###

Turbinas a vapor industriais possuem diversos sensores (classificados por tags), sensores estes que precisam ser monitorados por um operador humano, em um ambiente físico, para garantir o seu correto funcionamento. Operadores novatos precisam ainda de um apoio técnico, sanando informações sobre especificações da turbina e gestores precisam de informações do estado da turbina, para manutenção preditiva.

### A Solução ###

Nossa proposta é o de desenvolvimento de um assistente virtual inteligente que efetuará o monitoramento da turbina, em tempo real, de forma acessível, em qualquer lugar do mundo, oferecendo como principais funcionalidades:
•	Retornar valores dos sensores por comandos de voz e texto. 
Exemplo: Qual o RPM da turbina?
•	Monitorar a turbina de forma proativa, alertando sobre incidentes.
Exemplo para ativar o monitoramento: Ativar monitoramento.
•	Apoiar em dúvidas técnicas referente a turbina.
Exemplo: Por que o mancal aquece?
•	Responder em tempo real a perguntas para manutenção preditiva.
Exemplo: Qual o tempo de vida útil da turbina? 
O Guardião consegue retornar o valor de mais de 25 sensores, em tempo real, de uma turbina a vapor. A lista de sensores checados pode ser obtida dizendo ao Guardião: Listar sensores.
No modo de monitoramento (Ativar monitoramento), o Guardião alertará o usuário sobre incidentes com sensores através do celular, utilizando aplicativos como o Telegram. O usuário não precise mais ficar checando dashboards a todo tempo.
Antes do Guardião, a empresa possuía uma série de documentos e manuais sobre procedimentos técnicos e ações referentes a incidentes. Extraímos todo esse material em formas de perguntas e respostas agora facilmente consultadas.
O Guardião é capaz de fornecer em tempo real, informações de manutenção preditiva. É possível perguntar “Qual o tempo de vida útil da turbina?” e baseado em configurações e cálculos, ele retornará quantos dias restam e a data prevista de vida útil em tempo real. Um operador humano não consegue responder isso em tempo real. 
Para configurar o Guardião, é necessário logar como administrador através de reconhecimento facial ou cartões de login. Após o login, podemos enviar comandos como: configurar valor mínimo.
As respostas do Guardião podem ser retornadas em mais de 70 idiomas, permitindo seu uso por várias etnias. Para isso basta dizer: Fale em inglês (ou qualquer idioma que desejar). Retorna ainda as principais mensagens em LIBRAS.
É possível avaliar o Guardião, enviando: Avaliar Guardião. As avaliações são analisadas.
O Guardião está disponível em 3 canais: Telegram, Alexa, e o site: http://guardiaobot.com.br.

### Tecnologias Utilizadas ###

1) Bot Framework SDK
Através do Bot Framework da Microsoft, obtivemos ferramentas para criar, testar, implantar e gerenciar o Bot Guardião. Alguns dos recursos utilizados: 
•	ActivityHandler, MessageFactory, CardFactory, Adaptive Cards
•	Dispatch, LuisRecognizer, QnAMaker
•	WaterfallDialog, ComponentDialog

2) LUIS (Reconhecimento Vocal)
Utilizado para entender e interpretar os comandos desejados referente a turbina. Usado para acionar ações que o usuário deseja, como:
•	Obter valores de sensores: Qual o RPM da turbina?
•	Iniciar / Parar monitoramento: Iniciar monitoramento / Para monitoramento
•	Setar valores de alertas para monitorar: Configurar valor de alerta
•	Desconectar usuário logado Imagem (Custom Vision)

3) QNA Maker (Base de conhecimento)
Base de conhecimento onde foi importado manuais e documentos técnicos da turbina. Isso permitiu ao BOT:
•	Responder questões técnicas referente a turbina: Por que o mancal aquece?
•	Servir como guia de operações da turbina
•	Responder dúvidas quanto a problemas na turbina evitando acidentes
•	Foram adicionados ainda informações para permitir ao BOT ser mais amigável e possuir uma personalidade: Qual o seu nome? Quando você nasceu?

4) Face Api (Reconhecimento facial)
O reconhecimento facial foi utilizado para o sistema de logins. Há um banco de imagens e quando é enviado uma foto de um dos usuários cadastrados (Bill Gates, Satya Nadella, Silvio Santos), o sistema efetua o reconhecimento facial verificando as fotos (face verify), exibindo o % de acerto e então efetua o login administrativo, possibilitando o acesso a comandos de configuração. Comandos estes como: Configurar valor mínimo, configurar valor máximo, configurar alerta. Caso o usuário não tenha uma foto, ele pode utilizar ainda cartões de login para logar.

5) Custom Vision (Classificação de imagens)
Utilizado para classificação de imagens, possibilitando o reconhecimento delas. No Guardião foi usado especificamente para criar o sistema de login administrativo alternativo por imagem (cartões de login), onde o usuário envia seu cartão de login ao invés de sua foto.

6) Translator (Tradução em tempo real)
O Translator deu a capacidade do Guardião responder em mais de 70 idiomas, tornando-o extremamente acessível para várias etnias. Esta funcionalidade serve ainda como base de um projeto futuro de internacionalização do BOT. Para ativar as respostas em determinado idioma, basta dizer a ele: Responda em inglês. Onde "inglês" pode ser substituído pelo idioma desejado (português, espanhol, japonês, etc.).  

7) Text Analytics – Azure Cognitive Search (Análise de texto)
O Text Analytics nos permitiu criar um sistema de avaliação para o guardião. O usuário pode falar: Avaliar guardião e perguntaremos a ele o que achou do serviço. Utilizando o serviço de Text Analytics, conseguimos analisar o sentimento da resposta, se foi positiva, neutra ou negativa. Obtemos ainda um score da avaliação. Todas essas informações são salvas no banco de dados, para validarmos posteriormente e melhorarmos o serviço.

8) Content Moderator - Text Moderation (Detecção de palavrões e frases ofensivas)
O Content Moderator – Text Moderation pré-avalia a avaliação enviada pelo usuário, verificando se há palavrões e frases ofensivas e filtrando caso positivo. Esse serviço permite que sejam salvas no banco de dados, apenas avaliações realmente úteis.

9) Node JS (Server Side)
Utilizado no desenvolvimento do Backend do Bot, responsável pela execução de todo o código criado em linguagem Javascript. Durante a construção, foram utilizados vários "packages" do Node, são eles:
•	restify - framework web feito em node
•	dotenv - possibilitou trabalhar com arquivos .env (configuração)
•	node-persist - recurso de persistência no node
•	cognitiveservices-customvision - interface para o custom vision
•	mysql2 - conexão com o banco de dados
•	numero-por-extenso - converte números para extenso

10) MySQL Bitnami (Banco de Dados)
Disponível no Marketplace do Azure, o MySQL fornecido pela Bitnami possibilitou ativarmos rapidamente um Banco de Dados, responsável por guardar:
•	Listagem de sensores
•	Configurações de valores mínimos, máximo e de alerta dos sensores
•	Histórico de leitura dos sensores, minuto a minuto
•	Usuários administrativos

11) Joomla! by Bitnami (Website)
O Joomla! Certified by Bitnami é uma máquina virtual disponível no marketplace do Azure que nos possibilitou ativar rapidamente um website responsivo em Joomla, para servir como canal principal de acesso para vários dispositivos (Desktop, Smartphones, Tablets, etc.).
