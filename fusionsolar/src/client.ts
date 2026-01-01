import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';

interface LoginCredentials {
  username: string;
  password: string;
}

interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class FusionSolarClient {
  private client: AxiosInstance;
  private cookieFile: string;
  private credentials: LoginCredentials;
  private baseUrl = 'https://eu5.fusionsolar.huawei.com';
  private apiUrl = 'https://uni004eu5.fusionsolar.huawei.com';
  public stationDn = 'NE=XXXXXXXXXXXX';
  private cookies: CookieData[] = [];
  private headless: boolean;

  constructor(credentials: LoginCredentials, cookieFile = 'cookies.json', headless = true) {
    this.credentials = credentials;
    this.cookieFile = cookieFile;
    this.headless = headless;
    
    this.client = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
  }

  /**
   * Load cookies from file
   */
  private loadCookies(): boolean {
    try {
      if (fs.existsSync(this.cookieFile)) {
        const cookieData = fs.readFileSync(this.cookieFile, 'utf-8');
        this.cookies = JSON.parse(cookieData);
        console.log(`Loaded ${this.cookies.length} cookies from file`);
        return true;
      }
    } catch (error) {
      console.log('Failed to load cookies:', error instanceof Error ? error.message : error);
    }
    return false;
  }

  /**
   * Save cookies to file
   */
  private saveCookies(): void {
    try {
      fs.writeFileSync(this.cookieFile, JSON.stringify(this.cookies, null, 2));
      console.log(`Saved ${this.cookies.length} cookies to file`);
    } catch (error) {
      console.error('Failed to save cookies:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Convert cookies to axios header format
   */
  private getCookieHeader(): string {
    return this.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  /**
   * Keep session alive by calling the keep-alive endpoint
   */
  private async keepSessionAlive(): Promise<boolean> {
    if (this.cookies.length === 0) {
      console.log('No cookies available for keep-alive');
      return false;
    }

    try {
      const response = await this.client.get(
        `${this.apiUrl}/rest/dpcloud/auth/v1/keep-alive`,
        {
          headers: {
            'Cookie': this.getCookieHeader(),
            'Referer': this.baseUrl
          },
          validateStatus: () => true,
          maxRedirects: 0
        }
      );
      
      if (response.status === 200 && !response.data?.error) {
        console.log('Session keep-alive successful ✓');
        return true;
      }
      
      console.log('Session keep-alive failed');
      return false;
    } catch (error) {
      console.log('Keep-alive request failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Check if session is valid by making a test request
   */
  private async validateSession(): Promise<boolean> {
    if (this.cookies.length === 0) {
      console.log('No cookies available');
      return false;
    }

    try {
      const response = await this.client.get(
        `${this.apiUrl}/rest/pvms/web/station/v3/overview/energy-flow`,
        {
          params: {
            stationDn: this.stationDn,
            featureId: 'aifc'
          },
          headers: {
            'Cookie': this.getCookieHeader(),
            'Referer': this.baseUrl
          },
          validateStatus: () => true,
          maxRedirects: 0
        }
      );
      
      // Check if we got a successful response (not a redirect to login)
      if (response.status === 200 && response.data && !response.data.error) {
        console.log('Session is valid ✓');
        return true;
      }
      
      console.log('Session is invalid or expired');
      return false;
    } catch (error) {
      console.log('Session validation failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Perform login using Puppeteer
   */
  private async loginWithPuppeteer(): Promise<void> {
    console.log('Starting Puppeteer login...');
    
    const browser: Browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    try {
      const page: Page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      console.log('Navigating to login page...');
      await page.goto(`${this.baseUrl}/unisso/login.action`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the page to be ready
      console.log('Waiting for login form...');
      await page.waitForSelector('#username', { timeout: 15000 });
      
      // Small delay to ensure page is fully loaded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fill in username
      console.log('Filling in username...');
      await page.type('#username', this.credentials.username, { delay: 50 });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Fill in password
      console.log('Filling in password...');
      await page.type('#value', this.credentials.password, { delay: 50 });

      // Wait a bit before submitting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Click the login button - try common selectors
      console.log('Clicking login button...');
      
      const loginButtonSelector = 'button[type="submit"], input[type="submit"], #btn_submit, .login-btn';
      await page.click(loginButtonSelector).catch(async () => {
        // If button click fails, try pressing Enter
        console.log('Button not found, pressing Enter...');
        await page.keyboard.press('Enter');
      });

      // Wait for navigation or response
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]).catch(() => console.log('Navigation wait completed'));

      // Wait a bit for login to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if login was successful by checking URL or page content
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);

      // Get cookies from the browser
      const browserCookies = await page.cookies();
      console.log(`Retrieved ${browserCookies.length} cookies from browser`);

      if (browserCookies.length === 0) {
        throw new Error('Login failed: No cookies received');
      }

      // Store cookies
      this.cookies = browserCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined
      }));

      console.log('Login successful! ✓');
      this.saveCookies();

    } catch (error) {
      throw new Error(`Puppeteer login error: ${error instanceof Error ? error.message : error}`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Ensure we have a valid session (login if needed)
   */
  async ensureSession(): Promise<void> {
    // Try to load existing cookies
    const cookiesLoaded = this.loadCookies();
    
    if (cookiesLoaded) {
      // Validate the loaded session
      const isValid = await this.validateSession();
      if (isValid) {
        return;
      }
    }
    
    // If no valid session, perform login with Puppeteer
    console.log('No valid session found, performing login...');
    await this.loginWithPuppeteer();
    
    // Validate the new session
    const isValid = await this.validateSession();
    if (!isValid) {
      throw new Error('Login completed but session validation failed');
    }
  }

  /**
   * Fetch energy flow data
   */
  async getEnergyFlow(): Promise<any> {
    await this.ensureSession();
    
    // Keep session alive before fetching data
    await this.keepSessionAlive();
    
    try {
      const response = await this.client.get(
        `${this.apiUrl}/rest/pvms/web/station/v3/overview/energy-flow`,
        {
          params: {
            stationDn: this.stationDn,
            featureId: 'aifc'
          },
          headers: {
            'Cookie': this.getCookieHeader(),
            'Referer': this.baseUrl
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.log('Request failed, session may have expired. Attempting to re-login...');
      
      // Clear cookies and try to login again
      this.cookies = [];
      await this.loginWithPuppeteer();
      
      // Retry the request
      const response = await this.client.get(
        `${this.apiUrl}/rest/pvms/web/station/v3/overview/energy-flow`,
        {
          params: {
            stationDn: this.stationDn,
            featureId: 'aifc'
          },
          headers: {
            'Cookie': this.getCookieHeader(),
            'Referer': this.baseUrl
          }
        }
      );
      
      return response.data;
    }
  }
}
