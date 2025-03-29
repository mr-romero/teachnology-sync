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