const express  = require('express');
const multer   = require('multer');
const { authUser } = require('../middlewares/auth.middleware');
const {
    run,
    runWithFile,
    getJob,
    listJobs,
    downloadJob,
    removeJob,
    updateJob,
} = require('../controllers/notes.controller');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage() }); // buffer, no disk

router.post('/',             authUser,                      run);
router.post('/upload',       authUser, upload.single('file'), runWithFile);
router.get('/',              authUser,                      listJobs);
router.get('/:id',           authUser,                      getJob);
router.get('/:id/download',  authUser,                      downloadJob);
router.delete('/:id',        authUser,                      removeJob);
router.patch('/:id', authUser, updateJob);
module.exports = router;