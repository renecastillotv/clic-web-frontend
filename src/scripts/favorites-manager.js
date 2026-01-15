/**
 * SimpleFavoritesManager - Sistema de favoritos del cliente
 * Maneja favoritos de propiedades con sincronización en backend
 */

export class SimpleFavoritesManager {
  constructor() {
    this.API_URL = 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/favorites';
    this.API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';

    this.deviceId = this.getDeviceId();
    this.favorites = new Set();
    this.email = null;
    this.isLoaded = false;
    this._listeners = [];

    console.log('🔧 SimpleFavoritesManager initialized with deviceId:', this.deviceId);
    this.loadFavorites();
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'DEV-' + crypto.randomUUID().slice(0, 12);
      localStorage.setItem('device_id', deviceId);
      console.log('🆕 Generated new deviceId:', deviceId);
    }
    return deviceId;
  }

  async callAPI(endpoint, method = 'GET', body = null) {
    const url = `${this.API_URL}/${this.deviceId}${endpoint}`;

    const config = {
      method,
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    console.log('📡 API Call:', method, url, body);

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    return data;
  }

  async loadFavorites() {
    try {
      const data = await this.callAPI('');

      this.favorites = new Set(data.properties || []);
      this.email = data.email;
      this.isLoaded = true;

      console.log('✅ Favorites loaded:', {
        deviceId: this.deviceId,
        count: this.favorites.size,
        properties: Array.from(this.favorites),
        email: this.email
      });

      this.notifyListeners();

    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      this.isLoaded = true;
      this.notifyListeners();
    }
  }

  async addFavorite(propertyId) {
    try {
      console.log('💖 Adding favorite:', propertyId);

      this.favorites.add(propertyId);
      this.notifyListeners();

      const data = await this.callAPI('/add', 'POST', { propertyId });

      this.favorites = new Set(data.properties);
      this.notifyListeners();

      console.log('✅ Favorite added successfully');

    } catch (error) {
      console.error('❌ Error adding favorite:', error);

      this.favorites.delete(propertyId);
      this.notifyListeners();

      throw error;
    }
  }

  async removeFavorite(propertyId) {
    try {
      console.log('💔 Removing favorite:', propertyId);

      this.favorites.delete(propertyId);
      this.notifyListeners();

      const data = await this.callAPI('/remove', 'POST', { propertyId });

      this.favorites = new Set(data.properties);
      this.notifyListeners();

      console.log('✅ Favorite removed successfully');

    } catch (error) {
      console.error('❌ Error removing favorite:', error);

      this.favorites.add(propertyId);
      this.notifyListeners();

      throw error;
    }
  }

  async toggleFavorite(propertyId) {
    if (this.favorites.has(propertyId)) {
      await this.removeFavorite(propertyId);
    } else {
      await this.addFavorite(propertyId);
    }
  }

  async getFavoritesWithDetails() {
    try {
      const data = await this.callAPI('/details');
      return data.properties || [];
    } catch (error) {
      console.error('❌ Error getting favorites details:', error);
      return [];
    }
  }

  async updateEmail(email) {
    try {
      await this.callAPI('/email', 'PUT', { email });
      this.email = email;
      console.log('✅ Email updated:', email);
    } catch (error) {
      console.error('❌ Error updating email:', error);
      throw error;
    }
  }

  isFavorite(propertyId) {
    return this.favorites.has(propertyId);
  }

  getFavorites() {
    return this.favorites;
  }

  getFavoritesCount() {
    return this.favorites.size;
  }

  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      count: this.favorites.size,
      email: this.email,
      favorites: Array.from(this.favorites)
    };
  }

  addListener(callback) {
    if (!this._listeners.includes(callback)) {
      this._listeners.push(callback);

      if (this.isLoaded) {
        setTimeout(() => callback(this.getDeviceInfo()), 0);
      }
    }
  }

  removeListener(callback) {
    this._listeners = this._listeners.filter(listener => listener !== callback);
  }

  notifyListeners() {
    const info = this.getDeviceInfo();
    console.log('📢 Notifying listeners:', info);

    this._listeners.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        console.error('❌ Error in listener:', error);
      }
    });
  }
}

// NO auto-inicializar aquí - se hace en Layout.astro
// Esto permite que Astro procese correctamente el módulo
