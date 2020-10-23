<?php
$this->breadcrumbs=array(
	'Alternatives',
);

$this->menu=array(
	array('label'=>'Create Alternative', 'url'=>array('create')),
	array('label'=>'Manage Alternative', 'url'=>array('admin')),
);
?>

<h2>Alternatives</h2>

<?php $this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
)); ?>
