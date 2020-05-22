# Code modified from https://github.com/jsooter/RichFilemanager-Python3Flask/

from django.conf import settings
from django.http.response import JsonResponse
from django.core.files.storage import default_storage, FileSystemStorage
from django.core.files.base import ContentFile
from core.utils.response import send_file
from qdjango.utils.storage import OverwriteStorage
from .filemanagerresponse import FileManagerResponse
import os
import shutil
import tempfile
import mimetypes
import glob
from mimetypes import MimeTypes
from zipfile import ZipFile
from werkzeug.utils import secure_filename


PROJECTS_PATH = '{}{}'.format(settings.MEDIA_ROOT, 'projects')

class FileManager:

    def __init__(self, request, root_folder=None):
        self.request = request
        if root_folder:
            self.root = root_folder

        self.storage = OverwriteStorage(location=root_folder)

    def fileManagerError(self, title='FORBIDDEN_CHAR_SLASH', path='/'):
       return self.error(title, path)

    def is_safe_path(self, path, follow_symlinks=True):
       basedir = self.root

       # resolves symbolic links
       if follow_symlinks:
           return os.path.realpath(path).startswith(basedir)
       return os.path.abspath(path).startswith(basedir)

    def initiate(self):
        ''' Initial request to connector.
        Intended to provide the application with safe server-side data, such as shared
        configuration etc. Due to security reasons never share any credentials and other
        secured data. Provide only safe / public data. '''
        extensions                      = {}
        extensions['ignoreCase']        = True
        extensions['policy']            = "DISALLOW_LIST"
        extensions['restrictions']      = []
        security                        = {}
        security['allowFolderDownload'] = True;
        security['readOnly']            = False
        security['extensions']          = extensions;
        config                          = {}
        config['options']               = {'culture':'en'}
        config['security']              = security
        attributes                      = {}
        attributes['config']            = config
        data                            = {}
        data['id']                      = '/'
        data['type']                    = 'initiate'
        data['attributes']              = attributes
        response                        = {}
        response['data']                = data

        return JsonResponse(response)


    def getinfo(self):
        ''' Provides data for a single file. '''
        file        = self.request.GET.get('path').lstrip("/")
        path        = os.path.join(self.root,file)
        if (self.is_safe_path(path)):
           try:
               response    = FileManagerResponse(path, self.root)
               response.set_response()
               return JsonResponse(response.response)
           except Exception as e:
               return self.fileManagerError(path=path, title="NOT_ALLOWED")
        else:
           return self.fileManagerError(path=path)

    def readfolder(self):
        ''' Provides list of file and folder objects contained in a given directory. '''
        folder          = self.request.GET.get('path').lstrip("/")
        folder_path     = os.path.join(self.root, folder)
        data            = []

        # check fro projects, not ALLOWED
        if folder_path == PROJECTS_PATH:
            return self.fileManagerError(path=folder, title="NOT_ALLOWED")

        if (self.is_safe_path(folder_path)):
           try:
               for file in os.listdir(folder_path):
                   path        = os.path.join(folder_path, file)
                   if path == PROJECTS_PATH:
                       continue
                   response    = FileManagerResponse(path, self.root)
                   response.set_data()
                   data.append(response.data)
               results         = {}
               results['data'] = data
               return JsonResponse(results)
           except Exception as e:
               return self.fileManagerError(path=folder, title="NOT_ALLOWED")
        else:
           return self.fileManagerError(path=folder)

    def makeCaseInsensitiveGlobSearch(self,input):
        upper = input.upper()
        lower = input.lower()
        newstr=''
        for uc,lc in zip(upper,lower):
           if uc!=lc:
               newstr=newstr+'['+uc+lc+']'
           else:
               newstr=newstr+uc

        return newstr
    def seekfolder(self):
        ''' Provides list of file and folder objects contained in a given directory. '''
        folder          = self.request.GET.get('path').lstrip("/")
        folder_path     = os.path.join(self.root,folder)
        string = self.request.GET.get('string')
        data            = []
        if (self.is_safe_path(folder_path)):
           try:
               string=self.makeCaseInsensitiveGlobSearch(string)
               search=folder_path+'**/'+string+'*'
               #print(search)
               for file in glob.iglob(search, recursive=True):
               #     print(filename)
               #for file in os.listdir(folder_path):
                   path        = os.path.join(folder_path, file)
                   response    = FileManagerResponse(path, self.root)
                   response.set_data()
                   data.append(response.data)
               results         = {}
               results['data'] = data
               return JsonResponse(results)
           except Exception as e:
               return self.fileManagerError(path=folder,title="NOT_ALLOWED")
        else:
           return self.fileManagerError(path=folder,title="NOT_ALLOWED")

    def addfolder(self):
        ''' Creates a new directory on the server within the given path. '''
        path        = self.request.GET.get('path').lstrip("/")
        name        = self.request.GET.get('name')

        folder_path = os.path.join(self.root, path, name)

        if folder_path == PROJECTS_PATH:
            return self.fileManagerError(path=os.path.join("/", path, name), title="NOT_ALLOWED")

        if (self.is_safe_path(folder_path)):
           if not os.path.exists(folder_path):
               os.makedirs(folder_path)
               response    = FileManagerResponse(folder_path, self.root)
               response.set_response()
               return JsonResponse(response.response)
           else:
               return self.fileManagerError(path=os.path.join("/", path, name), title="DIRECTORY_ALREADY_EXISTS")
        else:
           return self.fileManagerError(path=os.path.join("/", path, name), title="NOT_ALLOWED")

    def upload(self):
        ''' Uploads a new file to the given folder.
            Upload form in the RichFilemanager passes an uploaded file. The name of the
            form element is defined by upload.paramName option in Configuration options
            ("files[]" by default). '''
        path = self.request.POST.get('path').lstrip("/")
        # check if the post request has the file part
        if 'files' in self.request.FILES:
            file = self.request.FILES.get('files')
            if file.name != '':
                filename  = secure_filename(file.name)
                file_path = os.path.join(self.root, path, filename)
                if (self.is_safe_path(file_path)):

                   self.storage.save(file_path, ContentFile(file.read()))

                   response  = FileManagerResponse(file_path, self.root)
                   response.set_response(multi=True)
                   return JsonResponse(response.response)
                else:
                   return self.fileManagerError(path=filename)
        # if upload failed return error
        return self.fileManagerError(path=path)

    def rename(self):
        ''' Renames an existed file or folder. '''
        # Relative path of the source file/folder to rename. e.g. "/images/logo.png"
        old      = self.request.GET.get('old').lstrip("/")
        parts    = old.split('/')
        filename = parts.pop()
        path     = '/'.join(parts)
        old_path = os.path.join(self.root,path,filename)
        # New name for the file/folder after the renaming. e.g. "icon.png"
        new      = self.request.GET.get('new')
        new_path = os.path.join(self.root,path,new)
        if filename:
           look = new_path
        else:
           oldname = parts.pop()
           path     = '/'.join(parts)
           new_path = os.path.join(self.root, path, new)
        if (self.is_safe_path(new_path)):
           os.rename(old_path, new_path)
           response = FileManagerResponse(new_path, root=self.root)
           response.set_response()
           return JsonResponse(response.response)
        else:
           return self.fileManagerError(path=new_path)

    def move(self):
        ''' Moves file or folder to specified directory. '''
        # Relative path of the source file/folder to move. e.g. "/images/logo.png"
        old      = self.request.GET.get('old').lstrip("/")
        parts    = old.split('/')
        filename = parts.pop()
        path     = '/'.join(parts)
        old_path = os.path.join(self.root,old)
        # New relative path for the file/folder after the move. e.g. "/images/target/"
        new      = self.request.GET.get('new').lstrip("/")
        new_path = os.path.join(self.root,new,filename)
        if (self.is_safe_path(new_path)):
           shutil.move(old_path,new_path)
           if filename:
              look = new_path
           else:
              look = new_path+'/'+parts[len(parts)-1]
           response = FileManagerResponse(look, root=self.root)
           response.set_response()
           return JsonResponse(response.response)
        else:
           return self.fileManagerError(path=new)

    def copy(self):
        ''' Copies file or folder to specified directory. '''
        # Relative path of the source file/folder to move. e.g. "/images/logo.png"
        old      = self.request.GET.get('source').lstrip("/")
        parts    = old.split('/')
        filename = parts.pop()
        path     = '/'.join(parts)
        old_path = os.path.join(self.root,old)
        # New relative path for the file/folder after the move. e.g. "/images/target/"
        new      = self.request.GET.get('target').lstrip("/")
        new_path = os.path.join(self.root,new,filename)
        if (self.is_safe_path(new_path) and self.is_safe_path(old_path)):
           shutil.copyfile(old_path, new_path)
           response = FileManagerResponse(new_path, root=self.root)
           response.set_response()
           return JsonResponse(response.response)
        else:
           return self.fileManagerError(path=new)

    def savefile(self):
        ''' Overwrites the content of the specific file to the "content" request parameter value. '''
        file    = self.request.POST.get('path').lstrip("/")
        content = self.request.POST.get('content')
        path    = os.path.join(self.root,file)
        if (self.is_safe_path(path)):
           if os.path.isfile(path):
               with open(path, "w") as fh:
                   fh.write(content)
           response = FileManagerResponse(path, root=self.root)
           response.set_response()
           return JsonResponse(response.response)
        else:
           return self.fileManagerError(path=file)

    def delete(self):
        ''' Deletes an existed file or folder. '''
        file    = self.request.GET.get('path').lstrip("/")
        path    = os.path.join(self.root, file)
        response = FileManagerResponse(path, root=self.root)
        response.set_response()
        if (self.is_safe_path(path)):
           if os.path.isdir(path):
               shutil.rmtree(path)
           elif os.path.isfile(path):
               os.remove(path)
           return JsonResponse(response.response)
        else:
           return self.fileManagerError(path=file)

    def download(self):
        ''' Downloads requested file or folder.
        The download process consists of 2 requests:
        1. Ajax GET request. Perform all checks and validation. Should return
        file/folder object in the response data to proceed.
        2. Regular GET request. Response headers should be properly configured
        to output contents to the browser and start download.
        Thus the implementation of download method should differentiate requests
        by type (ajax/regular) and act accordingly. '''
        file     = self.request.GET.get('path').lstrip("/")
        path     = os.path.join(self.root, file)
        mimetype, encoding = MimeTypes().guess_type(path)
        parts    = file.split('/')
        filename = parts.pop()
        # Check for AJAX request
        if self.request.is_ajax():
            response = FileManagerResponse(path, root=self.root)
            response.set_response()
            return JsonResponse(response.response)
        else:
           if (self.is_safe_path(path)):
               
               # check to see if this is a folder
               if os.path.isdir(path):
                   # grab the name of the folder to use
                   filename = parts.pop()
                   filename=os.path.basename(filename)+".zip"
                   # make a temporary directory to store the zipfile in it
                   dirpath = tempfile.mkdtemp()
                   output_filename = os.path.join(dirpath,filename)
                   shutil.make_archive(output_filename, 'zip', path)
                   output_filename = output_filename+".zip"

                   @app.after_request
                   def remove_file(response):
                       try:
                          # I think remove_file gets called for everything
                          if self.request.POST.get('mode')=='download' and dirpath:
                               shutil.rmtree(dirpath)
                               dirpath=None
                       except Exception as error:
                          print("Error removing or closing downloaded file handle", error)
                       return response
                   return send_file(output_filename,
                         mimetype=mimetype,
                         attachment_filename=filename,
                         as_attachment=True)
               else:
                   return send_file(filename, mimetype, path)
           else:
              return self.fileManagerError(path=file)

    def getimage(self):
        ''' Outputs the content of image file to browser. '''
        file      = self.request.GET.get('path').lstrip("/")
        path      = os.path.join(self.root, file)
        mime_type, encoding = mimetypes.guess_type(path)
        if self.is_safe_path(path):
           return send_file('', content_type=mime_type, file=path, attachment=False)
        else:
           return self.fileManagerError(path=file)

    def readfile(self):
        ''' Outputs the content of requested file to browser. Intended to read
        file requested via connector path (not absolute path), for files located
        outside document root folder or hosted on remote server. '''
        file     = self.request.GET.get('path').lstrip("/")
        path     = os.path.join(self.root,file)
        mimetype, encoding = MimeTypes().guess_type(path)
        parts = file.split('/')
        filename = parts.pop()
        if (self.is_safe_path(path)):
           return send_file(filename,
                     content_type=mimetype,
                     file=path)
        else:
           return self.fileManagerError(path=file)

    def directory_size(self,path):
        total_size = 0
        total_files = 0
        total_dirs = 0
        seen = set()

        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)

                try:
                    stat = os.stat(fp)
                except OSError:
                    continue

                if stat.st_ino in seen:
                    continue

                seen.add(stat.st_ino)
                

                total_size += stat.st_size
                total_files+= 1
            for d in dirnames:
                total_dirs+= 1

        return total_size,total_files,total_dirs  # size in bytes

    def summarize(self):
        ''' Display user storage folder summarize info. '''
        statinfo                = os.stat(self.root)
        attributes              = {}
        total_size,total_files,total_dirs = self.directory_size(self.root)
        print(total_size,total_files,total_dirs)
        attributes['size']      = total_size
        attributes['files']     = total_files
        attributes['folders']   = total_dirs
        attributes['sizeLimit'] = 0
        data                    = {}
        data['id']              = '/'
        data['type']            = 'summary'
        data['attributes']      = attributes
        result                  = {}
        result['data']          = data
        return JsonResponse(result)

    def extract(self):
        ''' Extract files and folders from zip archive.
        Note that only the first-level of extracted files and folders are returned
        in the response. All nested files and folders should be omitted for correct
        displaying at the client-side. '''
        source          = self.request.POST.get('source').lstrip("/")
        source_path     = os.path.join(self.root, source)
        target          = self.request.POST.get('target').lstrip("/")
        target_path     = os.path.join(self.root, target)

        if self.is_safe_path(source_path) and self.is_safe_path(target_path):
           with ZipFile(source_path, "r") as zip_ref:
               zip_ref.extractall(target_path)
           data            = []
           for file in os.listdir(target_path):
               path        = os.path.join(target_path, file)
               response    = FileManagerResponse(path, root=self.root)
               response.set_data()
               data.append(response.data)
           results         = {}
           results['data'] = data
           return JsonResponse(results)
        else:
           return self.fileManagerError(path=target_path)

    def error(self,title='Server Error. Unexpected Mode.', path="/"):
        '''  '''
        result           = {}
        errors           = []
        error            = {}
        meta             = {}
        error['id']      = 'server'
        error['code']    = '500'
        error['title']   = title
        meta['arguments'] = []
        meta['arguments'].append(path)
        error['meta']   = meta
        errors.append(error)
        result['errors'] = errors
        response=JsonResponse(result)
        response.status_code =  500
        return response


    def is_binary_file(self,filepathname):
        textchars = bytearray([7, 8, 9, 10, 12, 13, 27]) + bytearray(range(0x20, 0x7f)) + bytearray(range(0x80, 0x100))
        is_binary_string = lambda bytes: bool(bytes.translate(None, textchars))
        try:
            if is_binary_string(open(filepathname, 'rb').read(1024)):
               return True
        except UnicodeDecodeError:
            print('decode error')
        return False
