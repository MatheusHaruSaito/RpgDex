using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using MongoDbGenericRepository;
using RpgDex.Domain.Interfaces;

namespace RpgDex.Infrastructure.Repositories
{
    public class FileRepository : IFileRepository
    {
        //SOLUÇÃO TEMPORARIA PARA O USO DO CLOUD FLARE R2, DEPOIS IMPLEMENTAR O USO DO CLOUD FLARE R2 AQUI
        //Por enquanto os arquivos são salvos no mongo, mas futuramente serão salvos no cloud flare r2
        private readonly IGridFSBucket _gridFSBucket;
        public FileRepository(IGridFSBucket gridFSBucket)
        {
            _gridFSBucket = gridFSBucket;
        }

        public async Task<(byte[] fileBytes, string fileName)> DownloadFileAsync(string fileId)
        {

            if (!MongoDB.Bson.ObjectId.TryParse(fileId, out var objectId))
            {
                return (null, null);
            }

            try
            {
                var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", objectId);
                using var cursor = await _gridFSBucket.FindAsync(filter);
                var fileInfo = await cursor.FirstOrDefaultAsync();

                if (fileInfo == null)
                {
                    return (null, null);
                }

                var fileBytes = await _gridFSBucket.DownloadAsBytesAsync(objectId);

                return (fileBytes, fileInfo.Filename);
            }
            catch (GridFSFileNotFoundException)
            {
                return (null, null);
            }
        }

        public async Task<string> UploadFileAsync(string fileName, Stream fileStream)
        {
            var fileId = await _gridFSBucket.UploadFromStreamAsync(fileName, fileStream);
            return fileId.ToString();
        }
    }
}
