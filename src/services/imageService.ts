import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload an image to Supabase Storage
 * @param file The file to upload
 * @param userId The ID of the user uploading the file
 * @returns Object with URL and path if successful, or error if failed
 */
export const uploadImage = async (file: File, userId: string): Promise<{ url: string; path: string } | { error: string }> => {
  try {
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('lesson-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return { error: error.message };
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-images')
      .getPublicUrl(filePath);
    
    return {
      url: publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Exception in uploadImage:', error);
    return { error: 'Failed to upload image' };
  }
};

/**
 * Delete an image from Supabase Storage
 * @param path The storage path of the image to delete
 * @returns Success status
 */
export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('lesson-images')
      .remove([path]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in deleteImage:', error);
    return false;
  }
};

/**
 * Download an image from Supabase Storage and convert it to base64
 * @param url The public URL of the image
 * @returns Base64-encoded image string or error
 */
export const getImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    console.log('Fetching image from URL:', url);
    
    // Extract the path from the URL if it's a Supabase URL
    let path = '';
    if (url.includes('supabase')) {
      // Extract path from Supabase URL format
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'lesson-images');
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        path = urlParts.slice(bucketIndex + 1).join('/');
      }
    }
    
    let imageBlob: Blob;
    
    // If we have a valid Supabase path, use the Storage API
    if (path) {
      console.log('Downloading from Supabase path:', path);
      const { data, error } = await supabase.storage
        .from('lesson-images')
        .download(path);
      
      if (error || !data) {
        console.error('Error downloading image from Supabase:', error);
        // Fall back to fetch if Supabase download fails
        const response = await fetch(url);
        imageBlob = await response.blob();
      } else {
        imageBlob = data;
      }
    } else {
      // For external URLs, use fetch
      console.log('Downloading from external URL');
      const response = await fetch(url);
      imageBlob = await response.blob();
    }
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};
