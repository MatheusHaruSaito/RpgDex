using MongoDB.Bson;
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

            if (!ObjectId.TryParse(fileId, out var objectId))
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
        public async Task<bool> DeleteFileAsync(string fileId)
        {
            if (!ObjectId.TryParse(fileId, out var objectId))
            {
                return false;
            }

            try
            {
                await _gridFSBucket.DeleteAsync(objectId);
                return true;
            }
            catch (GridFSFileNotFoundException)
            {
                return false;
            }
        }
        public async Task<int> DeleteOrphanFilesAsync( IEnumerable<string> idsInUse,TimeSpan minimumAge, CancellationToken ct = default)
        {
            var inUse = idsInUse
                .Where(id => ObjectId.TryParse(id, out _))
                .Select(ObjectId.Parse)
                .ToHashSet();

            var cutoff = DateTime.UtcNow - minimumAge;
            var filter = Builders<GridFSFileInfo>.Filter.Lt(f => f.UploadDateTime, cutoff);

            var orphans = new List<ObjectId>();

            using var cursor = await _gridFSBucket.FindAsync(filter, cancellationToken: ct);
            while (await cursor.MoveNextAsync(ct))
            {
                foreach (var file in cursor.Current)
                {
                    if (!inUse.Contains(file.Id))
                        orphans.Add(file.Id);
                }
            }

            foreach (var id in orphans)
            {
                ct.ThrowIfCancellationRequested();
                await _gridFSBucket.DeleteAsync(id, ct);
            }

            return orphans.Count;
        }
    }
}
