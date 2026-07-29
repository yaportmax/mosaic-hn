import { Platform, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const safeFileName = (name: string): string => name.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'mosaic-hn-export';

export async function shareTextFile(name: string, contents: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    await Share.share({ title: name, message: contents });
    return name;
  }
  const file = new File(Paths.cache, safeFileName(name));
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Export ${name}` });
  else await Share.share({ title: name, message: contents });
  return file.uri;
}

export async function pickTextFile(mimeTypes: string[] = ['application/json', 'text/plain']): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return { name: asset.name, text };
}
