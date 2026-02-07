#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const CONFIG_DIR = path.join(os.homedir(), '.vinit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json');

function getStoredApiKey(): string | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return config.serperV || null;
    }
  } catch (error) {}
  return null;
}

function parseArgs(args: string[]) {
  const options: any = {
    query: '',
    url: '',
    limit: 10,
    type: 'search',
    gl: 'us',
    hl: 'en',
    page: 1,
    autocorrect: true,
    tbs: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '-q' || arg === '--query') {
      options.query = nextArg;
      i++;
    } else if (arg === '-u' || arg === '--url') {
      options.url = nextArg;
      i++;
    } else if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(nextArg);
      i++;
    } else if (arg === '-t' || arg === '--type') {
      options.type = nextArg;
      i++;
    } else if (arg === '-g' || arg === '--gl') {
      options.gl = nextArg;
      i++;
    } else if (arg === '-h' || arg === '--hl') {
      options.hl = nextArg;
      i++;
    } else if (arg === '-p' || arg === '--page') {
      options.page = parseInt(nextArg);
      i++;
    } else if (arg === '-a' || arg === '--autocorrect') {
      options.autocorrect = nextArg === 'true';
      i++;
    } else if (arg === '--tbs') {
      options.tbs = nextArg;
      i++;
    }
  }
  return options;
}

const args = process.argv.slice(2);
const command = args[0];
const apiKey = process.env.SERPER_API_KEY || getStoredApiKey();

if (command === 'auth') {
  const key = args[1];
  if (!key) {
    console.error('\n❌ Error: Please provide an API key: serperV auth <key>\n');
    process.exit(1);
  }
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const config = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) : {};
    config.serperV = key;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('\n✅ API Key stored successfully!\n');
  } catch (err) {
    console.error('\n❌ Storage failed:', (err as Error).message, '\n');
    process.exit(1);
  }
} else if (command === 'search') {
  const options = parseArgs(args.slice(1));
  if (!options.query) {
    console.error('\n❌ Error: Query required. Use -q or --query\n');
    process.exit(1);
  }
  if (!apiKey) {
    console.error('\n❌ Error: Serper API key not found. Run: serperV auth <key>\n');
    process.exit(1);
  }

  const payload: any = {
    q: options.query,
    num: options.limit,
    gl: options.gl,
    hl: options.hl,
    page: options.page,
    autocorrect: options.autocorrect
  };
  if (options.tbs) payload.tbs = options.tbs;

  makeRequest(`/${options.type}`, JSON.stringify(payload));
} else if (command === 'scrape') {
  const options = parseArgs(args.slice(1));
  if (!options.url) {
    console.error('\n❌ Error: URL required. Use -u or --url\n');
    process.exit(1);
  }
  if (!apiKey) {
    console.error('\n❌ Error: Serper API key not found. Run: serperV auth <key>\n');
    process.exit(1);
  }

  const urls = options.url.split(',').map((u: string) => u.trim());
  
  if (urls.length === 1) {
    makeRequest('/scrape', JSON.stringify({ url: urls[0] }));
  } else {
    // Bulk scraping
    process.stdout.write('[\n');
    const processNext = (index: number) => {
      if (index >= urls.length) {
        process.stdout.write('\n]\n');
        return;
      }
      const data = JSON.stringify({ url: urls[index] });
      const req = https.request({
        hostname: 'google.serper.dev',
        path: '/scrape',
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey || '',
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            process.stdout.write(JSON.stringify(JSON.parse(body), null, 2));
            if (index < urls.length - 1) process.stdout.write(',\n');
            processNext(index + 1);
          } catch (e) {
            console.error(`\n❌ Error parsing response for ${urls[index]}`);
            processNext(index + 1);
          }
        });
      });
      req.on('error', (err) => {
        console.error(`\n❌ Request failed for ${urls[index]}:`, err.message);
        processNext(index + 1);
      });
      req.write(data);
      req.end();
    };
    processNext(0);
  }
} else {
  console.log(`
Optimal Serper CLI (Zero Dependencies) - v2.5.0

Usage:
  serperV auth <key>                  Store API key
  serperV search [options]            Search (places, news, scholar, etc.)
  serperV scrape [options]            Scrape website content

Options:
  -q, --query <string>    Search query
  -u, --url <string>      URL(s) to scrape (comma-separated for bulk)
  -t, --type <string>     Endpoint (search, places, maps, news, shopping, scholar, patents)
  -l, --limit <number>    Result limit (Default 10)
  -g, --gl <string>       Country code (Default 'us')
  -h, --hl <string>       Language code (Default 'en')
  -p, --page <number>     Page number
  -a, --autocorrect <bool>
  --tbs <string>          Date range (e.g. qdr:h, qdr:d, qdr:w, qdr:m, qdr:y)

Examples:
  serperV search -q "Apple" --tbs qdr:h
  serperV scrape -u "https://google.com, https://apple.com"
  `);
}

function makeRequest(path: string, data: string) {
  const reqOptions = {
    hostname: 'google.serper.dev',
    path: path,
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey || '',
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: 30000
  };

  const req = https.request(reqOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          process.stdout.write(JSON.stringify(JSON.parse(body), null, 2) + '\n');
        } catch (e) {
          process.stdout.write(body + '\n');
        }
      } else {
        const errorMsg = res.statusCode === 401 || res.statusCode === 403 
          ? 'Unauthorized (Invalid API Key)' 
          : `Error ${res.statusCode}`;
        console.error(`\n❌ ${errorMsg}`);
        if (body) console.error('Details:', body);
        process.exit(1);
      }
    });
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('\n❌ Request timed out after 30 seconds');
    process.exit(1);
  });

  req.write(data);
  req.end();
}
