/**
 * SimpleFavoritesManager - Sistema de favoritos del cliente
 * Maneja favoritos de propiedades con sincronización en backend Neon
 * Incluye soporte para compartir y reacciones
 */

export class SimpleFavoritesManager {
  constructor() {
    // URL de la API de Neon
    this.API_URL = 'https://clic-api-neon.vercel.app/api/favorites';

    this.deviceId = this.getDeviceId();
    this.favorites = new Set();
    this.ownerName = null;
    this.ownerEmail = null;
    this.publicCode = null;
    this.isLoaded = false;
    this._listeners = [];

    // Para listas compartidas
    this.isSharedView = false;
    this.sharedListId = null;
    this.visitorAlias = null;
    this.visitors = [];
    this.reactions = {};

    console.log('SimpleFavoritesManager initialized with deviceId:', this.deviceId);
    this.loadFavorites();
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'DEV-' + crypto.randomUUID().slice(0, 12);
      localStorage.setItem('device_id', deviceId);
      console.log('Generated new deviceId:', deviceId);
    }
    return deviceId;
  }

  async callAPI(endpoint, method = 'GET', body = null) {
    const url = `${this.API_URL}${endpoint}`;

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    console.log('API Call:', method, url, body);

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  }

  async loadFavorites() {
    try {
      const data = await this.callAPI(`/${this.deviceId}`);

      if (data.success && data.data) {
        this.favorites = new Set(data.data.property_ids || []);
        this.ownerName = data.data.owner_name;
        this.ownerEmail = data.data.owner_email;
        this.publicCode = data.data.public_code;
        this.visitors = data.data.visitors || [];
        this.reactions = data.data.reactions || {};
      }

      this.isLoaded = true;

      console.log('Favorites loaded:', {
        deviceId: this.deviceId,
        count: this.favorites.size,
        properties: Array.from(this.favorites),
        ownerName: this.ownerName
      });

      this.notifyListeners();

    } catch (error) {
      console.error('Error loading favorites:', error);
      this.isLoaded = true;
      this.notifyListeners();
    }
  }

  async addFavorite(propertyId) {
    try {
      console.log('Adding favorite:', propertyId);

      // Optimistic update
      this.favorites.add(propertyId);
      this.notifyListeners();

      const data = await this.callAPI('/add', 'POST', {
        device_id: this.deviceId,
        property_id: propertyId
      });

      if (data.success && data.data) {
        this.favorites = new Set(data.data.property_ids || []);

        // Si es una lista nueva, disparar evento para mostrar modal de bienvenida
        if (data.isNewList && data.data.public_code) {
          console.log('New list created with public code:', data.data.public_code);
          window.dispatchEvent(new CustomEvent('favoritesNewListCreated', {
            detail: { publicCode: data.data.public_code }
          }));
        }
      }

      this.notifyListeners();
      console.log('Favorite added successfully');

    } catch (error) {
      console.error('Error adding favorite:', error);
      // Rollback
      this.favorites.delete(propertyId);
      this.notifyListeners();
      throw error;
    }
  }

  async removeFavorite(propertyId) {
    try {
      console.log('Removing favorite:', propertyId);

      // Optimistic update
      this.favorites.delete(propertyId);
      this.notifyListeners();

      const data = await this.callAPI('/remove', 'POST', {
        device_id: this.deviceId,
        property_id: propertyId
      });

      if (data.success && data.data) {
        this.favorites = new Set(data.data.property_ids || []);
      }

      this.notifyListeners();
      console.log('Favorite removed successfully');

    } catch (error) {
      console.error('Error removing favorite:', error);
      // Rollback
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

  async syncFavorites(propertyIds, ownerName = null) {
    try {
      const data = await this.callAPI('/sync', 'POST', {
        device_id: this.deviceId,
        property_ids: propertyIds,
        owner_name: ownerName
      });

      if (data.success && data.data) {
        this.favorites = new Set(data.data.property_ids || []);
        this.ownerName = data.data.owner_name;
      }

      this.notifyListeners();
      return data;
    } catch (error) {
      console.error('Error syncing favorites:', error);
      throw error;
    }
  }

  async getFavoritesWithDetails() {
    try {
      const data = await this.callAPI(`/details/${this.deviceId}`);
      if (data.success && data.data) {
        return data.data.properties || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting favorites with details:', error);
      return [];
    }
  }

  // ========================================================================
  // FUNCIONES PARA LISTAS COMPARTIDAS
  // ========================================================================

  getShareUrl() {
    const baseUrl = window.location.origin;
    return `${baseUrl}/favoritos/${this.deviceId}`;
  }

  async loadSharedList(listId) {
    try {
      this.isSharedView = true;
      this.sharedListId = listId;

      const data = await this.callAPI(`/${listId}`);

      if (data.success && data.data) {
        this.favorites = new Set(data.data.property_ids || []);
        this.ownerName = data.data.owner_name;
        this.visitors = data.data.visitors || [];
        this.reactions = data.data.reactions || {};
      }

      this.isLoaded = true;
      this.notifyListeners();

      return data.data;
    } catch (error) {
      console.error('Error loading shared list:', error);
      throw error;
    }
  }

  async joinSharedList(listId, alias) {
    try {
      const data = await this.callAPI('/visitor', 'POST', {
        list_id: listId,
        visitor_device_id: this.deviceId,
        alias: alias
      });

      if (data.success) {
        this.visitorAlias = alias;
        localStorage.setItem(`visitor_alias_${listId}`, alias);
      }

      return data;
    } catch (error) {
      console.error('Error joining shared list:', error);
      throw error;
    }
  }

  getVisitorAlias(listId) {
    return localStorage.getItem(`visitor_alias_${listId}`);
  }

  async addReaction(listId, propertyId, reactionType) {
    if (!this.visitorAlias) {
      throw new Error('Debe unirse a la lista primero');
    }

    try {
      const data = await this.callAPI('/reaction', 'POST', {
        list_id: listId,
        property_id: propertyId,
        visitor_device_id: this.deviceId,
        visitor_alias: this.visitorAlias,
        reaction_type: reactionType
      });

      // Refresh reactions
      await this.refreshReactions(listId);

      return data;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(listId, propertyId, reactionType) {
    try {
      const data = await this.callAPI('/reaction', 'DELETE', {
        list_id: listId,
        property_id: propertyId,
        visitor_device_id: this.deviceId,
        reaction_type: reactionType
      });

      // Refresh reactions
      await this.refreshReactions(listId);

      return data;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  async addComment(listId, propertyId, commentText) {
    if (!this.visitorAlias) {
      throw new Error('Debe unirse a la lista primero');
    }

    try {
      const data = await this.callAPI('/comment', 'POST', {
        list_id: listId,
        property_id: propertyId,
        visitor_device_id: this.deviceId,
        visitor_alias: this.visitorAlias,
        comment_text: commentText
      });

      // Refresh reactions
      await this.refreshReactions(listId);

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      const data = await this.callAPI(`/comment/${commentId}?visitor_device_id=${this.deviceId}`, 'DELETE');
      return data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async refreshReactions(listId) {
    try {
      const data = await this.callAPI(`/summary/${listId}`);
      if (data.success) {
        this.reactions = data.data || {};
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error refreshing reactions:', error);
    }
  }

  async getPropertyReactions(listId, propertyId) {
    try {
      const data = await this.callAPI(`/reactions/${listId}?property_id=${propertyId}`);
      return data.success ? data.data : { likes: [], dislikes: [], comments: [] };
    } catch (error) {
      console.error('Error getting property reactions:', error);
      return { likes: [], dislikes: [], comments: [] };
    }
  }

  // ========================================================================
  // FUNCIONES UTILITARIAS
  // ========================================================================

  isFavorite(propertyId) {
    return this.favorites.has(propertyId);
  }

  getFavorites() {
    return this.favorites;
  }

  getFavoritesCount() {
    return this.favorites.size;
  }

  getFavoritesArray() {
    return Array.from(this.favorites);
  }

  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      count: this.favorites.size,
      ownerName: this.ownerName,
      ownerEmail: this.ownerEmail,
      publicCode: this.publicCode,
      favorites: Array.from(this.favorites),
      isSharedView: this.isSharedView,
      sharedListId: this.sharedListId,
      visitorAlias: this.visitorAlias,
      visitors: this.visitors,
      reactions: this.reactions
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
    console.log('Notifying listeners:', info);

    this._listeners.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }
}

// NO auto-inicializar aqui - se hace en Layout.astro
// Esto permite que Astro procese correctamente el modulo
