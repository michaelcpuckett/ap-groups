"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const express = __importStar(require("express"));
const activitypub_core_server_express_1 = require("activitypub-core-server-express");
const mongodb_1 = require("mongodb");
const activitypub_core_db_mongo_1 = require("activitypub-core-db-mongo");
const activitypub_core_auth_firebase_1 = require("activitypub-core-auth-firebase");
const activitypub_core_storage_ftp_1 = require("activitypub-core-storage-ftp");
const activitypub_core_delivery_1 = require("activitypub-core-delivery");
const activitypub_core_plugin_foaf_1 = require("activitypub-core-plugin-foaf");
const activitypub_core_utilities_1 = require("activitypub-core-utilities");
const nunjucks = __importStar(require("nunjucks"));
const app = express.default();
app.use(express.static('static/'));
nunjucks.configure('views', {
    autoescape: true,
});
(async () => {
    const envServiceAccount = process.env.AP_SERVICE_ACCOUNT;
    if (!envServiceAccount) {
        throw new Error('Bad Service Account.');
    }
    const firebaseServiceAccount = JSON.parse(decodeURIComponent(envServiceAccount));
    const mongoClient = new mongodb_1.MongoClient(process.env.AP_MONGO_CLIENT_URL ?? 'mongodb://localhost:27017');
    await mongoClient.connect();
    const mongoDb = mongoClient.db(process.env.AP_MONGO_DB_NAME ?? 'groups');
    const firebaseAuthAdapter = new activitypub_core_auth_firebase_1.FirebaseAuthAdapter(firebaseServiceAccount, 'pickpuck-com');
    const mongoDbAdapter = new activitypub_core_db_mongo_1.MongoDbAdapter(mongoDb);
    const defaultDeliveryAdapter = new activitypub_core_delivery_1.DeliveryAdapter({
        adapters: {
            db: mongoDbAdapter,
        },
    });
    const ftpStorageAdapter = new activitypub_core_storage_ftp_1.FtpStorageAdapter(JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG)), '/uploads');
    const foafPlugin = (0, activitypub_core_plugin_foaf_1.FoafPlugin)();
    const renderLoginPage = async () => {
        return nunjucks.render('login.html');
    };
    const renderHomePage = async ({ actor }) => {
        return nunjucks.render('home.html', { actor });
    };
    const renderEntityPage = async ({ entity, actor }) => {
        return nunjucks.render('entity.html', { entity, actor });
    };
    app.use((0, activitypub_core_server_express_1.activityPub)({
        pages: {
            login: renderLoginPage,
            home: renderHomePage,
            entity: renderEntityPage,
        },
        adapters: {
            auth: firebaseAuthAdapter,
            db: mongoDbAdapter,
            delivery: defaultDeliveryAdapter,
            storage: ftpStorageAdapter,
        },
        plugins: [
            {
                generateActorId: () => (preferredUsername) => {
                    return `${activitypub_core_utilities_1.LOCAL_DOMAIN}/@${preferredUsername}`;
                },
            },
        ]
    }));
    app.get('/', async (req, res) => {
        if (!res.headersSent) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.write(nunjucks.render('index.html'));
            res.end();
        }
    });
    app.listen(process.env.PORT ?? 3000, () => {
        console.log('Running...');
    });
})();
//# sourceMappingURL=index.js.map