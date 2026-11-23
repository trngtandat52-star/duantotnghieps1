const pool = require('../config/db');
const getVariantPrice = require('../utils/productPricing');

async function readCart(userId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT ci.id AS cartItemId, p.id, p.name, p.slug, p.thumbnail, p.price,
            p.variants_size AS variantsSize, p.stock, ci.quantity, ci.variant_size AS variantSize,
            ci.variant_color AS variantColor
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ?
     ORDER BY ci.updated_at DESC, ci.id DESC`,
    [userId]
  );
  return rows.map(({ variantsSize, variantSize, ...item }) => {
    return {
      ...item,
      variantSize,
      price: getVariantPrice(item.price, variantsSize, variantSize)
    };
  });
}

function respondError(res, error) {
  console.error('Lỗi cart API:', error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Lỗi server khi xử lý giỏ hàng.'
  });
}

exports.getCart = async (req, res) => {
  try {
    const data = await readCart(req.user.id);
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return respondError(res, error);
  }
};

exports.addItem = async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const variantSize = String(req.body.variantSize || '').trim().slice(0, 50);
  const variantColor = String(req.body.variantColor || '').trim().slice(0, 50);

  if (!Number.isSafeInteger(productId) || productId < 1 ||
      !Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Sản phẩm hoặc số lượng không hợp lệ.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [products] = await connection.query(
      'SELECT id, stock, is_active FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );
    if (!products.length || !products[0].is_active) {
      const error = new Error('Sản phẩm không tồn tại hoặc đang ẩn.');
      error.status = 404;
      throw error;
    }

    const [matchingItems] = await connection.query(
      `SELECT quantity FROM cart_items
       WHERE user_id = ? AND product_id = ? AND variant_size = ? AND variant_color = ?
       FOR UPDATE`,
      [req.user.id, productId, variantSize, variantColor]
    );
    const [cartTotals] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );
    const newQuantity = Number(matchingItems[0]?.quantity || 0) + quantity;
    const totalQuantity = Number(cartTotals[0].quantity) + quantity;
    const stock = Number(products[0].stock) || 0;
    if (totalQuantity > stock) {
      const error = new Error(`Kho chỉ còn ${stock} sản phẩm. Vui lòng giảm số lượng.`);
      error.status = 409;
      throw error;
    }

    await connection.query(
      `INSERT INTO cart_items (user_id, product_id, quantity, variant_size, variant_color)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, productId, newQuantity, variantSize, variantColor]
    );
    await connection.commit();

    const data = await readCart(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Lỗi hoàn tác cập nhật giỏ hàng:', rollbackError);
      }
    }
    return respondError(res, error);
  } finally {
    if (connection) connection.release();
  }
};

exports.updateItem = async (req, res) => {
  const cartItemId = Number(req.params.cartItemId);
  const quantity = Number(req.body.quantity);
  if (!Number.isSafeInteger(cartItemId) || cartItemId < 1 ||
      !Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Sản phẩm hoặc số lượng không hợp lệ.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [items] = await connection.query(
      `SELECT ci.product_id, p.stock, p.is_active
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.id = ? AND ci.user_id = ?
       FOR UPDATE`,
      [cartItemId, req.user.id]
    );
    if (!items.length || !items[0].is_active) {
      const error = new Error('Không tìm thấy sản phẩm trong giỏ hàng.');
      error.status = 404;
      throw error;
    }
    if (quantity > Number(items[0].stock)) {
      const error = new Error(`Kho chỉ còn ${Number(items[0].stock)} sản phẩm.`);
      error.status = 409;
      throw error;
    }
    const [cartTotals] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND id <> ?',
      [req.user.id, items[0].product_id, cartItemId]
    );
    if (Number(cartTotals[0].quantity) + quantity > Number(items[0].stock)) {
      const error = new Error(`Kho chỉ còn tổng cộng ${Number(items[0].stock)} sản phẩm cho sản phẩm này.`);
      error.status = 409;
      throw error;
    }

    await connection.query(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [quantity, cartItemId, req.user.id]
    );
    await connection.commit();
    const data = await readCart(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Lỗi hoàn tác cập nhật số lượng:', rollbackError);
      }
    }
    return respondError(res, error);
  } finally {
    if (connection) connection.release();
  }
};

exports.removeItem = async (req, res) => {
  const cartItemId = Number(req.params.cartItemId);
  if (!Number.isSafeInteger(cartItemId) || cartItemId < 1) {
    return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ.' });
  }

  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ? AND id = ?', [req.user.id, cartItemId]);
    const data = await readCart(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return respondError(res, error);
  }
};

exports.clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, data: [] });
  } catch (error) {
    return respondError(res, error);
  }
};
