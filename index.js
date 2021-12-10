const path = require('path');
const dotenv = require('dotenv');
const restify = require('restify');

const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');

// Menu principal de dialogo
const { Guardiao } = require('./guardiao');

// Importa configurações .ENV
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Cria servidor HTTP
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\nGuardião aguardando em ${ server.url }. Conecte!`);
});

// Cria o adaptador
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Trata todas exceções.
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] Um problema ocorreu: ${ error }`);

    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Envia uma mensagem para o usuário em caso de erro
    //await context.sendActivity(`O Bot encontrou um erro. Contacte o administrador e informe. Context: ${ context } - Error: ${ error }`);
    console.log(`Error: ${ error } - Context: ${ context }`);
    
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

const memmoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memmoryStorage);
const userState = new UserState(MemoryStorage)

// Cria dialogo principal.
const guardiao = new Guardiao(conversationState,userState);

// Aguarda por conversações.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await guardiao.run(context);
    });
});
